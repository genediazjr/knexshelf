'use strict';

const Joi = require('@hapi/joi');
const Queries = require('./queries');

const noop = Function.prototype;
const cc = (us) => us.replace(/_([a-zA-Z])/g, (g) => g[1].toUpperCase());


exports.fixName = (schema) => {

    schema.name = schema.name || cc(schema.protoProps.tableName);

    return schema;
};


exports.internals = {
    cache: {
        get: noop,
        set: noop
    },
    columns: noop,
    broadcast: noop,
    formatters: {
        browse: async (query, schema) => {

            return { query, schema };
        },
        obtain: async (params, schema) => {

            return { params, schema };
        },
        create: async (payload, schema) => {

            return { payload, schema };
        },
        update: async (payload, params, schema) => {

            return { payload, params, schema };
        },
        delete: async (params, schema) => {

            return { params, schema };
        },
        scrimp: async (payload, schema) => {

            return { payload, schema };
        }
    }
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
    /* $lab:coverage:off$ */
    if (bookshelf && bookshelf.knex) {
        /* $lab:coverage:on$ */
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

    throw new Error('Unable to instantiate bookshelf, invalid parameter');
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

    throw new Error('Unable to instantiate bookshelves, invalid connections');
};


exports.createTable = async (schema, knex, opts) => {

    opts = Object.assign({}, schema.options, opts);

    if (knex && knex.knex) {
        knex = knex.knex;
    }

    if (schema.knex) {
        knex = schema.knex;
    }

    if (!await knex.schema.hasTable(schema.protoProps.tableName) || opts.isConstraintsBatch) {

        let hasCreatedTable = false;

        if (!opts.isConstraintsBatch) {

            if (schema.columns || opts.columns) {
                await knex.schema.createTable(schema.protoProps.tableName, (table) => {

                    if (!schema.isComposite) {
                        table.bigIncrements();
                    }

                    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

                    if (schema.protoProps.hasTimestamps) {
                        table.timestamp('updated_at');
                    }

                    if (schema.columns) {
                        schema.columns(table);
                    }

                    if (opts.columns) {
                        opts.columns(table);
                    }

                    exports.internals.columns(table);
                });

                hasCreatedTable = true;
            }

            if (schema.isComposite) {
                await knex.schema.raw(`ALTER TABLE ${schema.protoProps.tableName} ADD column id bigserial unique`);
            }
        }

        if (opts.isColumnsBatch) {

            return hasCreatedTable;
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

    if (schema.classProps) {
        schema.model = bookshelf.Model.extend(schema.protoProps, schema.classProps);
    }
    else {
        schema.model = bookshelf.Model.extend(schema.protoProps);
    }

    bookshelf.model(schema.protoProps.tableName, schema.model);

    schema.queries = schema.queries || noop;

    schema.schema = schema;

    schema.do = Object.assign({}, Queries.defaults(schema), schema.queries(schema));

    return schema;
};


exports.buildShelf = async (conns, schemas, opts) => {

    const shelf = exports.initConns(conns);
    shelf.models = {};
    shelf.methods = {};

    opts = opts || {};
    opts.schemas = opts.schemas || {};

    exports.internals.options = opts;

    if (Array.isArray(schemas)) {

        schemas = { default: schemas };
    }

    for (const key in schemas) {
        /* $lab:coverage:off$ */
        if (schemas.hasOwnProperty(key)) {
            /* $lab:coverage:on$ */

            const schemaGroup = schemas[key];
            const bookshelf = shelf.bookshelves[key];
            /* $lab:coverage:off$ */
            if (!bookshelf || !bookshelf.knex) {
                /* $lab:coverage:on$ */
                return Promise.reject(new Error(`No bookshelf defined for: ${key}`));
            }

            for (let s = 0; s < schemaGroup.length; ++s) {
                let schema = schemaGroup[s];
                schema = exports.fixName(schema);

                schema.hasCreatedTable = await exports.createTable(schema, bookshelf.knex, Object.assign({ isColumnsBatch: true }, opts.schemas[schema.name]));
            }

            for (let s = 0; s < schemaGroup.length; ++s) {
                let schema = schemaGroup[s];
                schema = exports.fixName(schema);

                if (schema.hasCreatedTable) {
                    await exports.createTable(schema, bookshelf.knex, Object.assign({isConstraintsBatch: true}, opts.schemas[schema.name]));
                }

                delete schema.hasCreatedTable;

                shelf.models[schema.name] = exports.loadModel(schema, bookshelf);

                if (shelf.models[schema.name].options || opts.schemas[schema.name]) {
                    shelf.models[schema.name].options = Object.assign({}, shelf.models[schema.name].options, opts.schemas[schema.name]);
                }

            }
        }
    }

    if (opts.methods) {
        if (!Array.isArray(opts.methods)) {

            opts.methods = [opts.methods];
        }

        for (let m = 0; m < opts.methods.length; ++m) {
            const methods = opts.methods[m](shelf);

            for (const mkey in methods) {
                /* $lab:coverage:off$ */
                if (methods.hasOwnProperty(mkey)) {
                    /* $lab:coverage:on$ */

                    shelf.methods[mkey] = methods[mkey];
                }
            }
        }
    }

    return shelf;
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

            const shelf = await exports.buildShelf(options.conns || opts.conns, schemas, options);
            const methods = [];

            for (const modelKey in shelf.models) {
                /* $lab:coverage:off$ */
                if (shelf.models.hasOwnProperty(modelKey)) {
                    /* $lab:coverage:on$ */

                    const model = shelf.models[modelKey];
                    const mopts = Object.assign({},
                        model.schema.options &&
                        model.schema.options.method,
                        options.schemas[modelKey] &&
                        options.schemas[modelKey].method);

                    const schema = function () {

                        return model.schema;
                    };

                    methods.push({
                        name: `models.${modelKey}.schema`,
                        method: schema
                    });

                    for (const queryKey in model.do) {
                        /* $lab:coverage:off$ */
                        if (model.do.hasOwnProperty(queryKey)) {
                            /* $lab:coverage:on$ */

                            methods.push({
                                name: `models.${modelKey}.do.${queryKey}`,
                                method: model.do[queryKey],
                                options: Object.assign({}, mopts[queryKey])
                            });
                        }
                    }
                }
            }

            for (const methodKey in shelf.methods) {
                /* $lab:coverage:off$ */
                if (shelf.methods.hasOwnProperty(methodKey)) {
                    /* $lab:coverage:on$ */

                    const method = shelf.methods[methodKey];

                    methods.push({
                        name: methodKey,
                        method: method,
                        options: Object.assign({}, method.options)
                    });
                }
            }

            server.method(methods);
            server.decorate('server', 'knexes', shelf.knexes);
            server.decorate('server', 'bookshelves', shelf.bookshelves);
        }
    };
};


exports.generateShelf = (packageJson, schematics, options) => {

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

            return await exports.buildShelf(conns,
                Object.assign(schematics, schemas),
                Object.assign(options, opts));
        },
        plugin: exports.generateHapiPlugin(packageJson, schematics, options)
    };
};
