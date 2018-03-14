'use strict';


exports.defaults = function (schema) {

    const defaults = {};

    const getFormatter = (opts, method) => {

        opts = opts || {};
        return opts.formatter || schema.formatters[method];
    };

    schema.references = Object.assign({}, {
        custom: [],
        browse: [],
        obtain: []
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

    defaults.custom = async function (query, opts) {

        const res = await schema.model
            .forge()
            .query(query)
            .fetchAll(Object.assign({
                withRelated: schema.references.custom,
                require: false
            }, opts));

        return res.toJSON();
    };

    defaults.browse = async function (query, opts) {

        query = query || {};

        let res;
        const formatter = getFormatter(opts, 'browse');
        const formatted = await formatter(query, schema);
        query = formatted.query;
        query = Object.assign({ sort: 'id', order: 'asc' }, query);

        if (query.perPage && query.page) {
            res = await schema.model
                .forge()
                .orderBy(query.sort, query.order)
                .fetchPage(Object.assign({
                    withRelated: schema.references.browse,
                    pageSize: query.perPage,
                    page: query.page
                }, opts));
        }
        else {
            res = await schema.model
                .forge()
                .orderBy(query.sort, query.order)
                .fetchAll(Object.assign({
                    withRelated: schema.references.browse,
                    require: false
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
                withRelated: schema.references.obtain,
                require: false
            }, opts));

        return res && res.toJSON();
    };

    defaults.create = async function (payload, opts) {

        payload = payload || {};

        const formatter = getFormatter(opts, 'create');
        const formatted = await formatter(payload, schema);

        const res = await schema.model
            .forge(formatted.payload)
            .save(null, Object.assign({}, opts));

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
                patch: true,
                require: true
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
            .destroy(Object.assign({
                require: true
            }, opts));

        return res.toJSON();
    };

    return defaults;
};