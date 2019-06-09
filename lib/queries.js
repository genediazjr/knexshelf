'use strict';

const lib = require('.');


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
        },
        scrimp: async (payload, schema) => {

            return { payload, schema };
        }
    }, schema.formatters);

    defaults.browse = async function (query, opts) {

        query = query || {};
        opts = opts || {};

        if (!lib.internals.models[schema.schema.name]) {
            lib.internals.models[schema.schema.name] = {};
        }

        let res;
        const formatter = getFormatter(opts, 'browse');
        let formatted = await lib.internals.formatters.browse(query, schema);
        formatted = await formatter(formatted.query, schema);
        query = formatted.query;
        query = Object.assign({ sort: 'id', order: 'asc' }, query);

        const key = `${schema.schema.name}:${
            JSON.stringify(query.perPage || '')}:${
            JSON.stringify(query.page || '')}:${
            JSON.stringify(query.custom || '')}`;

        const cache = opts.cache ||
            lib.internals.models[schema.schema.name].cache ||
            lib.internals.cache;

        const cached = await cache.get(key);

        if (cached) {

            return cached;
        }

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

        const result = {
            payload: res.toJSON(),
            pagination: res.pagination || {
                page: 0,
                pageSize: 0,
                rowCount: 0,
                pageCount: 0
            }
        };

        await cache.set(key, result);

        return result;
    };

    defaults.obtain = async function (params, opts) {

        if (!params) {

            return null;
        }

        if (!lib.internals.models[schema.schema.name]) {
            lib.internals.models[schema.schema.name] = {};
        }

        opts = opts || {};

        const formatter = getFormatter(opts, 'obtain');
        let formatted = await lib.internals.formatters.obtain(params, schema);
        formatted = await formatter(formatted.params, schema);
        params = formatted.params;

        const key = `${schema.schema.name}:${JSON.stringify(params)}`;

        const cache = opts.cache ||
            lib.internals.models[schema.schema.name].cache ||
            lib.internals.cache;

        const cached = await cache.get(key);

        if (cached) {

            return cached;
        }

        const res = await schema.model
            .forge(params)
            .fetch(Object.assign({
                withRelated: schema.references.obtain
            }, opts));

        const result = res && res.toJSON();
        await cache.set(key, result);

        return result;
    };

    defaults.create = async function (payload, opts) {

        payload = payload || {};

        const formatter = getFormatter(opts, 'create');
        let formatted = await lib.internals.formatters.create(payload, schema);
        formatted = await formatter(formatted.payload, schema);

        const res = await schema.model
            .forge(formatted.payload)
            .save(null, opts);

        const result = res.toJSON();
        await lib.internals.broadcast(schema.schema.name, {
            method: 'create',
            payload: result
        });

        return result;
    };

    defaults.update = async function (params, payload, opts) {

        params = params || {};
        payload = payload || {};
        opts = opts || {};

        if (!lib.internals.models[schema.schema.name]) {
            lib.internals.models[schema.schema.name] = {};
        }

        let res;
        const formatter = getFormatter(opts, 'update');
        let formatted = await lib.internals.formatters.update(payload, params, schema);
        formatted = await formatter(formatted.payload, formatted.params, schema);
        params = formatted.params;
        payload = formatted.payload;

        const key = `${schema.schema.name}:${JSON.stringify(params)}`;

        const cache = opts.cache ||
            lib.internals.models[schema.schema.name].cache ||
            lib.internals.cache;

        await cache.del(key);

        if (!params.id &&
            Object.keys(params).length) {

            if (opts && opts.multiple) {

                res = await schema.model
                    .where(params)
                    .save(payload, Object.assign({
                        method: 'update',
                        patch: true
                    }, opts));

                const result = res.toJSON();
                await lib.internals.broadcast(schema.schema.name, {
                    method: 'update',
                    payload: result
                });

                return result;
            }

            res = await schema.model
                .where(params)
                .fetchAll();

            res = res.toJSON();

            if (res.length > 1) {

                throw new Error('Update params found more than one row. Use multiple option');
            }

            /* $lab:coverage:off$ */
            params = { id: res[0] && res[0].id || 0 };
            /* $lab:coverage:on$ */
        }

        if (!Object.keys(params).length) {
            params = { id: 0 };
        }

        res = await schema.model
            .forge(params)
            .save(payload, Object.assign({
                patch: true
            }, opts));

        const result = res.toJSON();
        await lib.internals.broadcast(schema.schema.name, {
            method: 'update',
            payload: result
        });

        return result;
    };

    defaults.delete = async function (params, opts) {

        params = params || {};
        opts = opts || {};

        if (!lib.internals.models[schema.schema.name]) {
            lib.internals.models[schema.schema.name] = {};
        }

        let res;
        const formatter = getFormatter(opts, 'delete');
        let formatted = await lib.internals.formatters.delete(params, schema);
        formatted = await formatter(formatted.params, schema);
        params = formatted.params;

        const key = `${schema.schema.name}:${JSON.stringify(params)}`;

        const cache = opts.cache ||
            lib.internals.models[schema.schema.name].cache ||
            lib.internals.cache;

        await cache.del(key);

        if (!params.id &&
            Object.keys(params).length) {

            if (opts && opts.multiple) {

                res = await schema.model
                    .query((qb) => {

                        qb.where(params);
                    }).destroy(opts);

                const result = res.toJSON();
                await lib.internals.broadcast(schema.schema.name, {
                    method: 'delete',
                    id: result.id
                });

                return result;
            }

            res = await schema.model
                .where(params)
                .fetchAll();

            res = res.toJSON();

            if (res.length > 1) {

                throw new Error('Delete params found more than one row. Use multiple option');
            }

            /* $lab:coverage:off$ */
            params = { id: res[0] && res[0].id || 0 };
            /* $lab:coverage:on$ */
        }

        if (!Object.keys(params).length) {
            params = { id: 0 };
        }

        res = await schema.model
            .forge(params)
            .destroy(opts);

        const result = res.toJSON();
        await lib.internals.broadcast(schema.schema.name, {
            method: 'delete',
            id: result.id
        });

        return result;
    };

    defaults.scrimp = async function (payload, opts) {

        payload = payload || {};

        const formatter = getFormatter(opts, 'scrimp');
        let formatted = await lib.internals.formatters.scrimp(payload, schema);
        formatted = await formatter(formatted.payload, schema);

        if (formatted.payload.id) {

            return await defaults.update({ id: formatted.payload.id }, formatted.payload, opts);
        }

        return await defaults.create(formatted.payload, opts);
    };

    return defaults;
};
