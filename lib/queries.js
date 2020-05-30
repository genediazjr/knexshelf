/* eslint complexity: 0 */
'use strict';

const lib = require('.');


exports.defaults = function (schema) {

    if (!lib.internals.models[schema.schema.name]) {
        lib.internals.models[schema.schema.name] = {};
    }

    const defaults = {};

    const runFixer = async (payload, opts) => {

        if (payload) {

            payload = await lib.internals.formatters.fixer(payload);
            payload = await schema.formatters.fixer(payload);

            if (opts.fixer) {
                payload = await opts.fixer(payload);
            }
        }

        return payload;
    };

    const getFormatter = (opts, method) => {

        return opts.formatter || schema.formatters[method];
    };

    const getCache = (opts) => {

        return opts.cache ||
            lib.internals.models[schema.schema.name].cache ||
            lib.internals.cache;
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

    schema.formatters = Object.assign({}, lib.internals.formatters, schema.formatters);

    defaults.browse = async function (query, opts) {

        query = query || {};
        opts = opts || {};

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

        const cache = getCache(opts);
        const cached = await cache.get(key);

        if (cached) {

            return cached;
        }

        const fetchOpts = Object.assign({
            withRelated: schema.references.browse
        }, opts);

        const fetch = schema.model.forge();

        if (!query.noSort) {
            fetch.orderBy(query.sort, query.order);
        }

        if (query.custom) {
            fetch.query(query.custom);
        }

        if (!query.all && query.perPage && query.page) {
            fetchOpts.pageSize = query.perPage;
            fetchOpts.page = query.page;

            res = await fetch.fetchPage(fetchOpts);
        }
        else {

            res = await fetch.fetchAll(fetchOpts);
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

        const furnished = [];
        for (let r = 0; r < result.payload.length; ++r) {
            const fixres = await runFixer(result.payload[r], opts);
            if (fixres) {
                furnished.push(fixres);
            }
        }

        result.payload = furnished;

        await cache.set(key, result);

        return result;
    };

    defaults.obtain = async function (params, opts) {

        if (!params) {

            return null;
        }

        opts = opts || {};

        let res;
        const formatter = getFormatter(opts, 'obtain');
        let formatted = await lib.internals.formatters.obtain(params, schema);
        formatted = await formatter(formatted.params, schema);
        params = formatted.params;

        const key = `${schema.schema.name}:${JSON.stringify(params)}`;
        const cache = getCache(opts);
        const cached = await cache.get(key);

        if (cached) {

            return cached;
        }

        res = await schema.model
            .where(params)
            .fetchAll(Object.assign({
                withRelated: schema.references.obtain
            }, opts));

        res = res.toJSON();

        if (res.length > 1) {

            throw new Error('Obtain params found more than one row. Use browse instead');
        }

        const result = await runFixer(res[0] || null, opts);

        await cache.set(key, result);

        return result;
    };

    defaults.create = async function (payload, opts) {

        payload = payload || {};
        opts = opts || {};

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

        let res;
        const formatter = getFormatter(opts, 'update');
        let formatted = await lib.internals.formatters.update(payload, params, schema);
        formatted = await formatter(formatted.payload, formatted.params, schema);
        params = formatted.params;
        payload = formatted.payload;

        const key = `${schema.schema.name}:${JSON.stringify(params)}`;
        const cache = getCache(opts);
        await cache.del(key);

        if (!params.id &&
            Object.keys(params).length) {

            if (opts.multiple) {

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

        let res;
        const formatter = getFormatter(opts, 'delete');
        let formatted = await lib.internals.formatters.delete(params, schema);
        formatted = await formatter(formatted.params, schema);
        params = formatted.params;

        const key = `${schema.schema.name}:${JSON.stringify(params)}`;
        const cache = getCache(opts);
        await cache.del(key);

        if (!params.id &&
            Object.keys(params).length) {

            if (opts.multiple) {

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
        opts = opts || {};

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
