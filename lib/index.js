'use strict';

const Joi = require('joi');
const Queries = require('./queries');

const noop = () => {
};


exports.initBookshelf = (param, plugins) => {

    let bookshelf;

    if (param.knex) {

        bookshelf = param;
    }

    if (param.raw) {

        bookshelf = require('bookshelf')(param);
    }

    if (!Joi.string().validate(param).error) {

        bookshelf = require('bookshelf')(require('knex')(param));
    }

    if (bookshelf && bookshelf.knex) {
        bookshelf.plugin('registry');
        bookshelf.plugin('pagination');

        if (Array.isArray(plugins)) {

            for (let p = 0; p < plugins.length; ++p) {

                const plugin = plugins[p];

                if (plugin !== 'registry' &&
                    plugin !== 'pagination') {

                    bookshelf.plugin(plugin);
                }
            }
        }

        return bookshelf;
    }

    throw new Error('unable to instantiate bookshelf, invalid parameter');
};


exports.initConns = (conns) => {

    const container = {
        bookshelves: {},
        knexes: {}
    };

    if (!Joi.string().validate(conns).error) {

        conns = { default: conns };
    }

    if (!Joi.object().validate(conns).error) {

        const keys = Object.keys(conns);

        for (let k = 0; k < keys.length; ++k) {

            const key = keys[k];

            container.bookshelves[key] = exports.initBookshelf(conns[key]);
            container.knexes[key] = container.bookshelves[key].knex;
        }

        return container;
    }

    throw new Error('unable to instantiate bookshelves, invalid connections');
};


exports.createTable = async (schema, knex, opts) => {

    opts = Object.assign({}, schema.options, opts);

    if (knex && knex.knex) {
        knex = knex.knex;
    }

    if (schema.knex) {
        knex = schema.knex;
    }

    if (!await knex.schema.hasTable(schema.protoProps.tableName)) {
        if (schema.columns || opts.columns) {
            await knex.schema.createTable(schema.protoProps.tableName, (table) => {

                if (!schema.isComposite) {
                    table.bigIncrements();
                }

                table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

                if (opts.columns) {

                    opts.columns(table);
                }

                if (schema.columns) {
                    schema.columns(table);
                }
            });
        }

        if (schema.isComposite) {
            await knex.schema.raw(`ALTER TABLE public.${schema.protoProps.tableName} ADD column id bigserial unique`);
        }

        if (schema.constraints || opts.constraints) {
            await knex.schema.table(schema.protoProps.tableName, (table) => {

                if (opts.constraints) {
                    opts.constraints(table);
                }

                if (schema.constraints) {
                    schema.constraints(table);
                }
            });
        }

        if (schema.raw) {
            await knex.schema.raw(schema.raw);
        }
    }
};


exports.loadModel = (schema, bookshelf) => {

    if (schema.bookshelf) {
        bookshelf = schema.bookshelf;
    }

    if (!bookshelf || !bookshelf.Model) {

        throw new Error('Bookshelf instance is invalid');
    }

    schema.protoProps.hasTimestamps = schema.protoProps.hasTimestamps || ['created_at'];

    if (schema.classProps) {
        schema.model = bookshelf.Model.extend(schema.protoProps, schema.classProps);
    }
    else {
        schema.model = bookshelf.Model.extend(schema.protoProps);
    }

    bookshelf.model(schema.name, schema.model);

    schema.queries = schema.queries || noop;

    schema.schema = schema;

    schema.do = Object.assign({}, Queries.defaults(schema), schema.queries(schema));

    return schema;
};


exports.buildBarrel = async (conns, schemas, opts) => {

    const barrel = exports.initConns(conns);
    barrel.models = {};
    barrel.methods = {};

    opts = opts || {};
    opts.schemas = opts.schemas || {};

    if (Array.isArray(schemas)) {

        schemas = { default: schemas };
    }

    for (const key in schemas) {
        /* $lab:coverage:off$ */
        if (schemas.hasOwnProperty(key)) {
            /* $lab:coverage:on$ */

            const schemaGroup = schemas[key];
            const bookshelf = barrel.bookshelves[key];

            if (!bookshelf || !bookshelf.knex) {

                return Promise.reject(new Error(`No bookshelf defined for: ${key}`));
            }

            for (let s = 0; s < schemaGroup.length; ++s) {
                const schema = schemaGroup[s];

                await exports.createTable(schema, bookshelf.knex, opts.schemas[schema.name]);

                barrel.models[schema.name] = exports.loadModel(schema, bookshelf);
            }
        }
    }

    if (opts.methods) {
        if (!Array.isArray(opts.methods)) {

            opts.methods = [opts.methods];
        }

        for (let m = 0; m < opts.methods.length; ++m) {
            const methods = opts.methods[m](barrel);

            for (const mkey in methods) {
                /* $lab:coverage:off$ */
                if (methods.hasOwnProperty(mkey)) {
                    /* $lab:coverage:on$ */

                    barrel.methods[mkey] = methods[mkey];
                }
            }
        }
    }

    return barrel;
};


exports.generateHapiPlugin = (packageJson, schemas, opts) => {

    opts = opts || {};

    return {
        pkg: require(packageJson),
        once: true,
        register: async function (server, options) {

            if (!options.conns && !opts.conns) {

                return Promise.reject(new Error('Missing connections'));
            }

            /* $lab:coverage:off$ */
            options = options || {};
            options.schemas = Object.assign({}, opts.schemas, options.schemas);
            options.methods = (options.methods || []).concat(opts.methods || []);
            /* $lab:coverage:on$ */

            const barrel = await exports.buildBarrel(options.conns || opts.conns, schemas, options);
            const methods = [];

            for (const modelKey in barrel.models) {
                /* $lab:coverage:off$ */
                if (barrel.models.hasOwnProperty(modelKey)) {
                    /* $lab:coverage:on$ */

                    const model = barrel.models[modelKey];
                    const mopts = Object.assign({},
                        model.schema.options &&
                        model.schema.options.method,
                        options.schemas[modelKey] &&
                        options.schemas[modelKey].method);

                    for (const queryKey in model.do) {
                        /* $lab:coverage:off$ */
                        if (model.do.hasOwnProperty(queryKey)) {
                            /* $lab:coverage:on$ */

                            methods.push({
                                name: `models.${modelKey}.${queryKey}`,
                                method: model.do[queryKey],
                                options: Object.assign({}, mopts[queryKey])
                            });
                        }
                    }
                }
            }

            for (const methodKey in barrel.methods) {
                /* $lab:coverage:off$ */
                if (barrel.methods.hasOwnProperty(methodKey)) {
                    /* $lab:coverage:on$ */

                    const method = barrel.methods[methodKey];

                    methods.push({
                        name: methodKey,
                        method: method,
                        options: Object.assign({}, method.options)
                    });
                }
            }

            server.method(methods);
            server.decorate('server', 'knexes', barrel.knexes);
            server.decorate('server', 'bookshelves', barrel.bookshelves);
        }
    };
};


exports.generateBarrel = (packageJson, schematics, options) => {

    /* $lab:coverage:off$ */
    schematics = schematics || {};
    options = options || {};
    /* $lab:coverage:on$ */

    return {
        init: async (conns, schemas, opts) => {

            /* $lab:coverage:off$ */
            schemas = schemas || {};
            opts = opts || {};
            /* $lab:coverage:on$ */

            return await exports.buildBarrel(conns,
                Object.assign(schematics, schemas),
                Object.assign(options, opts));
        },
        plugin: exports.generateHapiPlugin(packageJson, schematics, options)
    };
};
