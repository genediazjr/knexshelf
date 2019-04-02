'use strict';


exports.defaults = function (schema) {

    const defaults = {};

    const getFormatter = (opts, method) => {

        opts = opts || {};
        return opts.formatter || schema.formatters[method];
    };

    const props = Object.keys(schema.protoProps);
    /* $lab:coverage:off$ */
    const r1 = props.indexOf('tableName');
    if (r1 > -1) {
        props.splice(r1, 1);
    }
    /* $lab:coverage:on$ */
    const r2 = props.indexOf('withUpdatedAt');
    if (r2 > -1) {
        props.splice(r2, 1);
    }

    const r3 = props.indexOf('hasTimestamps');
    if (r3 > -1) {
        props.splice(r3, 1);
    }

    schema.references = Object.assign({}, {
        browse: props,
        obtain: props
    }, schema.references);

    schema.formatters = Object.assign({}, {
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
        }
    }, schema.formatters);

    defaults.browse = async function (query, opts) {

        query = query || {};

        let res;
        const formatter = getFormatter(opts, 'browse');
        const formatted = await formatter(query, schema);
        query = formatted.query;
        query = Object.assign({ sort: 'id', order: 'asc' }, query);

        if (query.perPage && query.page && query.custom) {

            res = await schema.model
                .forge()
                .query(query.custom)
                .orderBy(query.sort, query.order)
                .fetchPage(Object.assign({
                    withRelated: schema.references.browse,
                    pageSize: query.perPage,
                    page: query.page
                }, opts));
        }
        else if (query.perPage && query.page) {

            res = await schema.model
                .forge()
                .orderBy(query.sort, query.order)
                .fetchPage(Object.assign({
                    withRelated: schema.references.browse,
                    pageSize: query.perPage,
                    page: query.page
                }, opts));
        }
        else if (query.custom) {

            res = await schema.model
                .forge()
                .query(query.custom)
                .orderBy(query.sort, query.order)
                .fetchAll(Object.assign({
                    withRelated: schema.references.browse
                }, opts));
        }
        else {

            res = await schema.model
                .forge()
                .orderBy(query.sort, query.order)
                .fetchAll(Object.assign({
                    withRelated: schema.references.browse
                }, opts));
        }

        return res.toJSON();
    };

    defaults.obtain = async function (params, opts) {

        if (!params) {

            return null;
        }

        const formatter = getFormatter(opts, 'obtain');
        const formatted = await formatter(params, schema);
        params = formatted.params;

        const res = await schema.model
            .forge(params)
            .fetch(Object.assign({
                withRelated: schema.references.obtain
            }, opts));

        return res && res.toJSON();
    };

    defaults.create = async function (payload, opts) {

        payload = payload || {};

        const formatter = getFormatter(opts, 'create');
        const formatted = await formatter(payload, schema);

        const res = await schema.model
            .forge(formatted.payload)
            .save(null, opts);

        return res.toJSON();
    };

    defaults.update = async function (params, payload, opts) {

        params = params || {};
        payload = payload || {};

        const formatter = getFormatter(opts, 'update');
        const formatted = await formatter(payload, params, schema);

        const res = await schema.model
            .forge(formatted.params)
            .save(formatted.payload, Object.assign({
                patch: true
            }, opts));

        return res.toJSON();
    };

    defaults.delete = async function (params, opts) {

        params = params || {};

        let res;
        const formatter = getFormatter(opts, 'delete');
        const formatted = await formatter(params, schema);
        params = formatted.params;

        if (!params.id &&
            Object.keys(params).length) {

            res = await schema.model
                .forge(params)
                .fetch();

            /* $lab:coverage:off$ */
            params = { id: res && res.toJSON().id || 0 };
            /* $lab:coverage:on$ */
        }

        if (!Object.keys(params).length) {
            params = { id: 0 };
        }

        res = await schema.model
            .forge(params)
            .destroy(opts);

        return res.toJSON();
    };

    return defaults;
};
