'use strict';

const Hapi = require('@hapi/hapi');
const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const Lib = require('..');
const Methods = require('./methods');
const Methodz = require('./methodz');
const Schemas = require('./schemas');
const Testlib = require('./testlib');

const expect = Code.expect;
const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;

const cacheString = 'redis://localhost:6379';
const connString = 'postgres://postgres:postgres@localhost:5432/postgres';

const timeout = (ms) => {

    return new Promise((res) => {

        return setTimeout(res, ms);
    });
};

describe('lib', () => {

    it('exports.initBookshelf', () => {

        const bsString = Lib.initBookshelf(connString);
        const bsPlugin = Lib.initBookshelf(connString, ['bookshelf-processor-plugin']);
        const bsKnex = Lib.initBookshelf(require('knex')(connString));
        const bsBookshelf = Lib.initBookshelf(require('bookshelf')(require('knex')(connString)));

        expect(bsString.knex).to.exist();
        expect(bsPlugin.knex).to.exist();
        expect(bsKnex.knex).to.exist();
        expect(bsBookshelf.knex).to.exist();

        expect(() => {

            Lib.initBookshelf({});
        }).to.throw(Error, 'Unable to instantiate bookshelf, invalid parameter');
    });

    it('exports.initConns', () => {

        const oakb = Lib.initConns(connString);
        const oakt = Lib.initConns({ test: connString });

        expect(oakb.bookshelves.default.knex).to.exist();
        expect(oakb.knexes.default.raw).to.exist();
        expect(oakt.bookshelves.test.knex).to.exist();
        expect(oakt.knexes.test.raw).to.exist();

        expect(() => {

            Lib.initConns(0);
        }).to.throw(Error, 'Unable to instantiate bookshelves, invalid connections');
    });

    it('exports.createTable', async () => {

        const knex = Lib.initConns(connString).knexes.default;

        const Model1 = Object.assign({}, Schemas[0]);
        const Model2 = Object.assign({}, Schemas[1]);

        const hasTable = async (model) => {

            const hasTable = await knex.schema.hasTable(model.protoProps.tableName);

            await knex.schema.dropTableIfExists(model.protoProps.tableName);

            return hasTable;
        };

        await hasTable(Model1);
        await hasTable(Model2);

        await Lib.createTable(Model1, knex);
        await Lib.createTable(Model1, knex);

        expect(await hasTable(Model1)).to.be.true();

        await Lib.createTable(Model1, knex);

        expect(await hasTable(Model1)).to.be.true();

        await Lib.createTable(Model1, Lib.initConns(connString).bookshelves.default);

        expect(await hasTable(Model1)).to.be.true();

        Model1.knex = knex;

        await Lib.createTable(Model1);

        expect(await hasTable(Model1)).to.be.true();

        Model1.columns = null;
        Model1.constraints = null;

        await Lib.createTable(Model1, knex, {
            columns: (table) => {

                table.string('unique');
            },
            constraints: (table) => {

                table.unique('unique');
            }
        });

        expect(await hasTable(Model1)).to.be.true();

        await Lib.createTable(Model2, knex);

        expect(await hasTable(Model2)).to.be.true();

        Model2.raw = `ALTER TABLE public.${Model2.protoProps.tableName} ADD column rawtest text`;

        await Lib.createTable(Model2, knex);

        expect(await hasTable(Model2)).to.be.true();
    });

    it('exports.loadModel', async () => {

        const bookshelf = Lib.initConns(connString).bookshelves.default;

        const Model0 = Object.assign({}, Schemas[0]);
        const Model1 = Object.assign({}, Schemas[0]);
        const Model3 = Object.assign({}, Schemas[2]);
        const Model4 = Object.assign({}, Schemas[3]);
        const Model5 = Object.assign({}, Schemas[4]);
        const Model6 = Object.assign({}, Schemas[5]);
        const Model9 = Object.assign({}, Schemas[9]);
        const Model11 = Object.assign({}, Schemas[11]);
        const Model12 = Object.assign({}, Schemas[12]);
        const Model13 = Object.assign({}, Schemas[13]);
        const Model14 = Object.assign({}, Schemas[14]);

        await bookshelf.knex.schema.dropTableIfExists(Model4.protoProps.tableName);
        await bookshelf.knex.schema.dropTableIfExists(Model3.protoProps.tableName);
        await bookshelf.knex.schema.dropTableIfExists(Model1.protoProps.tableName);
        await bookshelf.knex.schema.dropTableIfExists(Model5.protoProps.tableName);
        await bookshelf.knex.schema.dropTableIfExists(Model6.protoProps.tableName);
        await bookshelf.knex.schema.dropTableIfExists(Model9.protoProps.tableName);
        await bookshelf.knex.schema.dropTableIfExists(Model11.protoProps.tableName);
        await bookshelf.knex.schema.dropTableIfExists(Model12.protoProps.tableName);
        await bookshelf.knex.schema.dropTableIfExists(Model13.protoProps.tableName);
        await bookshelf.knex.schema.dropTableIfExists(Model14.protoProps.tableName);

        await Lib.createTable(Model3, bookshelf);
        await Lib.createTable(Model4, bookshelf);
        await Lib.createTable(Model1, bookshelf);
        await Lib.createTable(Model5, bookshelf);
        await Lib.createTable(Model6, bookshelf);
        await Lib.createTable(Model9, bookshelf);
        await Lib.createTable(Model11, bookshelf);
        await Lib.createTable(Model12, bookshelf);
        await Lib.createTable(Model13, bookshelf);
        await Lib.createTable(Model14, bookshelf);

        const soloTable = Lib.loadModel(Model1, bookshelf);
        const bookModel = Lib.loadModel(Model4, bookshelf);
        const authorModel = Lib.loadModel(Model3, bookshelf);
        const updatedModel = Lib.loadModel(Model6, bookshelf);
        const noIdTestModel = Lib.loadModel(Model9, bookshelf);
        const formatterModel = Lib.loadModel(Model5, bookshelf);
        const withJSONBModel = Lib.loadModel(Model11, bookshelf);
        const withJSONModel = Lib.loadModel(Model12, bookshelf);
        const useJSONBModel = Lib.loadModel(Model13, bookshelf);
        const useJSONModel = Lib.loadModel(Model14, bookshelf);

        await updatedModel.do.create({ label: 'updateme' });

        expect(authorModel.do.testing()).to.equal('author');

        Model0.name = 'soloTablex';
        Model0.protoProps.tableName = 'solo_table_x';
        Model0.bookshelf = bookshelf;

        Lib.loadModel(Model0);

        let res;

        expect(await soloTable.do.browse({
            perPage: 2,
            page: 2
        })).to.equal({
            payload: [],
            pagination: {
                page: 2,
                pageSize: 2,
                rowCount: 0,
                pageCount: 0
            }
        });

        expect(await soloTable.do.browse({
            perPage: 2,
            page: 2,
            custom: (query) => {

                query.orderByRaw('id DESC');
            }
        })).to.equal({
            payload: [],
            pagination: {
                page: 2,
                pageSize: 2,
                rowCount: 0,
                pageCount: 0
            }
        });

        expect(await soloTable.do.browse({
            perPage: 2,
            custom: (query) => {

                query.orderByRaw('id DESC');
            }
        })).to.equal({
            payload: [],
            pagination: {
                page: 0,
                pageSize: 0,
                rowCount: 0,
                pageCount: 0
            }
        });

        expect(await soloTable.do.browse({
            custom: (query) => {

                query.orderByRaw('id DESC');
            }
        })).to.equal({
            payload: [],
            pagination: {
                page: 0,
                pageSize: 0,
                rowCount: 0,
                pageCount: 0
            }
        });

        expect(await soloTable.do.browse()).to.equal({
            payload: [],
            pagination: {
                page: 0,
                pageSize: 0,
                rowCount: 0,
                pageCount: 0
            }
        });

        expect(await withJSONBModel.do.obtain()).to.equal(null);
        expect(await withJSONModel.do.obtain()).to.equal(null);

        await withJSONBModel.do.create({ label: 'foobar', meta: { a: 'a' } });
        await withJSONModel.do.create({ label: 'foobar', meta: { b: 'b' } });

        res = await withJSONBModel.do.obtain({ id: 1 });

        expect(res.label).to.equal('foobar');
        expect(res.meta.a).to.equal('a');

        res = await withJSONModel.do.obtain({ id: 1 });

        expect(res.label).to.equal('foobar');
        expect(res.meta.b).to.equal('b');

        await withJSONBModel.do.create({ label: 'barfoo', meta: { c: 'c' } });
        await withJSONModel.do.create({ label: 'barfoo', meta: { d: 'd' } });

        res = await withJSONBModel.do.obtain({ label: 'barfoo' });

        expect(res.id).to.equal('2');
        expect(res.meta.c).to.equal('c');

        res = await withJSONModel.do.obtain({ label: 'barfoo' });

        expect(res.id).to.equal('2');
        expect(res.meta.d).to.equal('d');

        expect(await useJSONBModel.do.obtain()).to.equal(null);
        expect(await useJSONModel.do.obtain()).to.equal(null);

        await useJSONBModel.do.create({ label: 'usebar', with_jsonb_id: 1 });
        await useJSONModel.do.create({ label: 'usebar', with_json_id: 1 });

        res = await useJSONBModel.do.obtain({ id: 1 });

        expect(res.with_jsonb.meta.a).to.equal('a');

        await expect(useJSONModel.do.obtain({ id: 1 })).to.reject(Error, 'select distinct "with_json".* from "with_json" where "with_json"."id" in ($1) - could not identify an equality operator for type json');

        expect(await soloTable.do.obtain()).to.equal(null);

        await soloTable.do.create({ label: 'test' });

        res = await soloTable.do.browse();

        expect(res.payload[0].label).to.equal('test');

        await noIdTestModel.do.create({ code: 'foobar', remarks: 'insert' });
        await noIdTestModel.do.create({ code: 'foobar2', remarks: 'insert' });
        await noIdTestModel.do.create({ code: 'foobar3', remarks: 'some' });

        res = await noIdTestModel.do.browse();

        expect(res.payload[0].remarks).to.equal('insert');
        expect(res.payload[1].remarks).to.equal('insert');

        await expect(noIdTestModel.do.update({ remarks: 'insert' }, { code: 'test' })).to.reject(Error, 'Update params found more than one row. Use multiple option');

        await noIdTestModel.do.update({ remarks: 'insert' }, { remarks: 'test' }, { multiple: true });

        res = await noIdTestModel.do.browse();

        expect(res.payload[0].remarks).to.equal('test');
        expect(res.payload[1].remarks).to.equal('test');

        await noIdTestModel.do.update({ code: 'foobar' }, { remarks: 'single' });
        await noIdTestModel.do.update({ code: 'foobar' }, { remarks: 'test' }, {});

        res = await noIdTestModel.do.browse();

        expect(res.payload[0].remarks).to.equal('test');
        expect(res.payload[1].remarks).to.equal('test');

        await expect(noIdTestModel.do.delete({ remarks: 'test' })).to.reject(Error, 'Delete params found more than one row. Use multiple option');

        await noIdTestModel.do.delete({ remarks: 'test' }, { multiple: true });
        await noIdTestModel.do.delete({ code: 'foobar3' }, {});

        res = await noIdTestModel.do.browse();

        expect(res).to.equal({
            payload: [],
            pagination: {
                page: 0,
                pageSize: 0,
                rowCount: 0,
                pageCount: 0
            }
        });

        await soloTable.do.update({ id: 1 }, { label: 'foobar' });

        res = await soloTable.do.browse();

        expect(res.payload[0].label).to.equal('foobar');

        await expect(soloTable.do.delete()).to.reject(Error, 'No Rows Deleted');

        await expect(soloTable.do.delete({
            label: 'foobars'
        })).to.reject(Error, 'No Rows Deleted');

        await soloTable.do.delete({ label: 'foobar' });

        expect(await soloTable.do.browse()).to.equal({
            payload: [],
            pagination: {
                page: 0,
                pageSize: 0,
                rowCount: 0,
                pageCount: 0
            }
        });

        const author = await authorModel.do.create({ name: 'tolkien' });
        await bookModel.do.create({ author_id: author.id, title: 'the hobbit' });

        res = await authorModel.do.browse();

        expect(res.payload[0].name).to.equal('tolkien');

        res = await bookModel.do.browse({ page: 1, perPage: 10 });

        expect(res.payload[0].title).to.equal('the hobbit');

        const qb = bookModel.model.query();

        res = await qb.where({ id: 1 }).select();

        expect(res[0].title).to.equal('the hobbit');

        res = await bookModel.do.obtain({ id: 1 });

        expect(res.author.name).to.equal('tolkien');

        expect(await bookModel.do.obtain({ id: 3 })).to.equal(null);

        await bookModel.do.delete({ title: 'the hobbit' });
        await authorModel.do.delete({ id: 1 });

        expect(await bookModel.do.browse()).to.equal({
            payload: [],
            pagination: {
                page: 0,
                pageSize: 0,
                rowCount: 0,
                pageCount: 0
            }
        });

        await formatterModel.do.create();

        res = await formatterModel.do.browse({}, {
            formatter: async (query, schema) => {
                return { query, schema };
            }
        });

        expect(res.payload[0].label).to.equal('fixed');

        expect(await formatterModel.do.browse()).to.equal({
            payload: [],
            pagination: {
                page: 2,
                pageSize: 1,
                rowCount: 1,
                pageCount: 1
            }
        });

        await formatterModel.do.create();

        res = await formatterModel.do.browse();

        expect(res.payload[0].label).to.equal('fixed');

        res = await formatterModel.do.browse({}, { fixer: async () => null });

        expect(res.payload).to.equal([]);

        res = await formatterModel.do.browse({ all: true });

        expect(res.payload[0].label).to.equal('fixed');

        await formatterModel.do.update({ id: 2 }, { label: 'foobar' });

        res = await formatterModel.do.browse();

        expect(res.payload[0].label).to.equal('updated');

        res = await formatterModel.do.browse({}, {
            formatter: async (query, schema) => {
                return { query, schema };
            }
        });

        expect(res.payload[0].label).to.equal('fixed');

        await expect(formatterModel.do.update()).to.reject(Error, 'No Rows Updated');

        await expect(formatterModel.do.delete({
            label: 'foobar'
        })).to.reject(Error, 'No Rows Deleted');

        await expect(formatterModel.do.delete({
            id: 1
        })).to.reject(Error, 'No Rows Deleted');

        await expect(soloTable.do.create()).to.reject(Error,
            'insert into "solo_table" default values returning * - null value in column "label" violates not-null constraint');

        await timeout(1000);

        await updatedModel.do.update({ id: 1 }, { label: 'updated' });

        res = await updatedModel.do.browse();

        const delay = res.payload[0].updated_at.getTime() - res.payload[0].created_at.getTime();

        expect(delay).to.be.above(1000);
        expect(delay).to.be.below(2000);

        res = await soloTable.do.scrimp({ label: 'scrimp' });

        res.label = 'newval';

        res = await soloTable.do.scrimp(res);

        expect(res.label).to.equal('newval');

        await expect(soloTable.do.scrimp()).to.reject(Error,
            'insert into "solo_table" default values returning * - null value in column "label" violates not-null constraint');

        await bookshelf.knex.schema.dropTableIfExists(Model4.protoProps.tableName);
        await bookshelf.knex.schema.dropTableIfExists(Model3.protoProps.tableName);
        await bookshelf.knex.schema.dropTableIfExists(Model1.protoProps.tableName);
        await bookshelf.knex.schema.dropTableIfExists(Model5.protoProps.tableName);
        await bookshelf.knex.schema.dropTableIfExists(Model6.protoProps.tableName);
        await bookshelf.knex.schema.dropTableIfExists(Model11.protoProps.tableName);
        await bookshelf.knex.schema.dropTableIfExists(Model12.protoProps.tableName);
        await bookshelf.knex.schema.dropTableIfExists(Model13.protoProps.tableName);
        await bookshelf.knex.schema.dropTableIfExists(Model14.protoProps.tableName);

        expect(() => {

            Lib.loadModel(Model1);
        }).to.throw(Error, 'Bookshelf instance is invalid');

        expect(() => {

            Lib.loadModel(Model1, {});
        }).to.throw(Error, 'Bookshelf instance is invalid');
    });

    it('exports.buildShelf', async () => {

        const Modelx = Object.assign({}, Schemas[4], { protoProps: { tableName: 'formatter_tablex' } });
        const Model0 = Object.assign({}, Schemas[0], { name: 'book2' });
        const Models2 = [Model0];
        const shelf0 = await Lib.buildShelf(connString);
        const shelf = await Lib.buildShelf(connString, Schemas, { methods: [Methods] });
        const shelf2 = await Lib.buildShelf({ foobar: connString }, { foobar: Schemas });
        const shelf3 = await Lib.buildShelf({
            foobar: connString,
            barfoo: connString
        }, {
            foobar: Schemas,
            barfoo: Models2
        });

        const shelf4 = await Lib.buildShelf(connString, [Modelx], {
            schemas: {
                formatterTable: {
                    columns: (table) => {

                        table.string('somecolumn');
                    }
                }
            }
        });

        const shelf78 = await Lib.buildShelf(connString, [Schemas[7], Schemas[8]]);

        expect(shelf78.models.recurseReferenceTableA).to.exist();
        expect(shelf78.models.recurseReferenceTableB).to.exist();

        expect(shelf0.bookshelves.default.knex).to.exist();
        expect(shelf0.knexes.default.raw).to.exist();

        expect(await shelf.methods.testing()).to.equal('methodtestrowling');

        expect(shelf.bookshelves.default.knex).to.exist();
        expect(shelf.knexes.default.raw).to.exist();
        expect(shelf.models.soloTable.do).to.exist();
        expect(shelf.models.compositeTable.do).to.exist();
        expect(shelf.models.author.do).to.exist();
        expect(shelf.models.author.do.testing).to.exist();
        expect(await shelf.models.author.do.hasModel()).to.equal(true);
        expect(shelf.models.book.do).to.exist();

        expect(await shelf.models.book.do.browse()).to.equal({
            payload: [],
            pagination: {
                page: 0,
                pageSize: 0,
                rowCount: 0,
                pageCount: 0
            }
        });

        expect(shelf2.bookshelves.foobar.knex).to.exist();
        expect(shelf2.knexes.foobar.raw).to.exist();
        expect(shelf2.models.soloTable.do).to.exist();
        expect(shelf2.models.compositeTable.do).to.exist();
        expect(shelf2.models.author.do).to.exist();
        expect(shelf2.models.book.do).to.exist();

        expect(await shelf2.models.book.do.browse()).to.equal({
            payload: [],
            pagination: {
                page: 0,
                pageSize: 0,
                rowCount: 0,
                pageCount: 0
            }
        });

        expect(shelf3.bookshelves.foobar.knex).to.exist();
        expect(shelf3.knexes.foobar.raw).to.exist();
        expect(shelf3.models.soloTable.do).to.exist();
        expect(shelf3.models.compositeTable.do).to.exist();
        expect(shelf3.models.author.do).to.exist();
        expect(shelf3.models.book.do).to.exist();
        expect(shelf3.bookshelves.barfoo.knex).to.exist();
        expect(shelf3.knexes.barfoo.raw).to.exist();
        expect(shelf3.models.soloTable.do).to.exist();
        expect(shelf3.models.compositeTable.do).to.exist();
        expect(shelf3.models.author.do).to.exist();
        expect(shelf3.models.book.do).to.exist();

        expect(await shelf3.models.book2.do.browse()).to.equal({
            payload: [],
            pagination: {
                page: 0,
                pageSize: 0,
                rowCount: 0,
                pageCount: 0
            }
        });

        const res4 = await shelf4.models.formatterTable.do.create({ somecolumn: 'test' });

        expect(res4.somecolumn).to.equal('test');

        Lib.internals.preBuild = async (shelf, schemas) => {

            schemas.default[3].name = 'fook';
        };

        Lib.internals.postBuild = async (shelf) => {

            await shelf.models.fook.do.create({ title: 'foobook' });
        };

        const shelfx = await Lib.buildShelf(connString, Schemas, { methods: [Methods] });
        const res = await shelfx.models.fook.do.browse();

        expect(res.payload[0].title).to.equal('foobook');

        await shelf3.models.compositeTable.do.create({ text: 'foo', id1: 1, id2: 1 });
        await shelf3.models.compositeTable.do.create({ text: 'foo', id1: 1, id2: 2 });

        await expect(shelf3.models.compositeTable.do.obtain({ text: 'foo' })).to.reject(Error, 'Obtain params found more than one row. Use browse instead');

        Schemas[3].name = 'book';

        await shelf.bookshelves.default.knex.schema.dropTableIfExists(Modelx.protoProps.tableName);
        await shelf.bookshelves.default.knex.schema.dropTableIfExists(Schemas[4].protoProps.tableName);
        await shelf.bookshelves.default.knex.schema.dropTableIfExists(Schemas[3].protoProps.tableName);
        await shelf.bookshelves.default.knex.schema.dropTableIfExists(Schemas[2].protoProps.tableName);
        await shelf.bookshelves.default.knex.schema.dropTableIfExists(Schemas[1].protoProps.tableName);
        await shelf.bookshelves.default.knex.schema.dropTableIfExists(Schemas[0].protoProps.tableName);

        Lib.internals.postBuild = Function.prototype;
        Lib.internals.preBuild = Function.prototype;

        await expect(Lib.buildShelf({
            foobar: connString
        }, {
            foobarx: Schemas
        })).to.reject(Error, 'No bookshelf defined for: foobarx');

        await expect(Lib.buildShelf(
            connString,
            Schemas, {
                methods: [Methods, Methodz]
            })
        ).to.reject(Error, 'Duplicate method name testing.');
    });

    it('exports.generateHapiPlugin', async () => {

        const server = Hapi.server();
        const serverx = Hapi.server();
        const serverz = Hapi.server();
        const serverv = Hapi.server();
        const servery = Hapi.server();
        const serveru = Hapi.server();

        await serveru.register({
            plugin: Lib.generateHapiPlugin('../package.json'),
            options: { conns: connString }
        });

        await server.register({
            plugin: Lib.generateHapiPlugin('../package.json', Schemas),
            options: { conns: connString }
        });

        await serverz.register({
            plugin: Lib.generateHapiPlugin('../package.json', Schemas, { methods: [Methods] }),
            options: { conns: connString }
        });

        await servery.register({
            plugin: Lib.generateHapiPlugin('../package.json', Schemas, { methods: [Methods] }),
            options: {
                conns: connString,
                methods: [
                    () => {

                        return {
                            testingz: async () => {

                                return 'testingz';
                            }
                        };
                    }
                ]
            }
        });

        await serverx.register({
            plugin: Lib.generateHapiPlugin('../package.json', Schemas, {
                conns: connString,
                schemas: {
                    compositeTable: {
                        method: {
                            obtain: {
                                cache: {
                                    expiresIn: 2000,
                                    generateTimeout: 100
                                },
                                generateKey: (params, opts) => {

                                    return `${params}${opts}`;
                                }
                            }
                        }
                    }
                }
            })
        });

        expect(serveru.bookshelves.default.knex).to.exist();
        expect(serveru.knexes.default.raw).to.exist();

        const models = server.methods.models;
        const modelsx = serverx.methods.models;

        expect(models.soloTable.schema()).to.exist();

        await models.soloTable.do.create({ label: 'farboo' });

        let res = await models.soloTable.do.obtain({ id: 1 });

        expect(res.label).to.equal('farboo');

        res = await modelsx.soloTable.do.browse();

        expect(res.payload[0].label).to.equal('farboo');

        await expect(serverv.register({
            plugin: Lib.generateHapiPlugin('../package.json', Schemas)
        })).to.reject(Error, 'Missing connections');

        await expect(models.soloTable.do.obtain({
            id: 2
        }, {
            require: true
        })).to.reject(Error, 'EmptyResponse');

        expect(await servery.methods.testingz()).to.equal('testingz');
        expect(await serverz.methods.testing()).to.equal('farboorowling');

        await server.knexes.default.schema.dropTableIfExists(Schemas[3].protoProps.tableName);
        await server.knexes.default.schema.dropTableIfExists(Schemas[2].protoProps.tableName);
        await server.knexes.default.schema.dropTableIfExists(Schemas[1].protoProps.tableName);
        await server.knexes.default.schema.dropTableIfExists(Schemas[0].protoProps.tableName);

        server.route({
            method: 'get',
            path: '/',
            handler: async (request) => {

                return request.server.methods.models.soloTable.schema().name;
            }
        });

        res = await server.inject('/');

        expect(res.result).to.equal('soloTable');
    });

    it('exports.generateShelf', async () => {

        Lib.internals.columns = (table) => {

            table.boolean('is_deleted').notNullable().defaultTo(false);
        };

        const shelf = await Testlib.init(connString);

        expect(shelf.bookshelves.default.knex).to.exist();
        expect(shelf.knexes.default.raw).to.exist();
        expect(shelf.models.soloTable.do).to.exist();
        expect(shelf.models.compositeTable.do).to.exist();
        expect(shelf.models.author.do).to.exist();
        expect(shelf.models.book.do).to.exist();

        expect(Object.keys(shelf.models.soloTable.columnInfo)).to.equal(['id', 'created_at', 'label', 'is_deleted']);

        let res;

        expect(await shelf.models.book.do.browse()).to.equal({
            payload: [],
            pagination: {
                page: 0,
                pageSize: 0,
                rowCount: 0,
                pageCount: 0
            }
        });

        const server = Hapi.server();

        await server.register({
            plugin: Testlib,
            options: {
                conns: connString,
                schemas: {
                    author: {
                        method: {
                            obtain: {
                                cache: {
                                    expiresIn: 2000,
                                    generateTimeout: 100
                                },
                                generateKey: (params, opts) => {

                                    return `${params}${opts}`;
                                }
                            }
                        }
                    }
                }
            }
        });

        const models = server.methods.models;

        expect(Object.keys(server.methods.models.soloTable.columnInfo())).to.equal(['id', 'created_at', 'label', 'is_deleted']);

        await models.soloTable.do.create({ label: 'farboo' });

        res = await models.soloTable.do.obtain({ id: 1 });

        expect(res.label).to.equal('farboo');
        expect(res.is_deleted).to.equal(false);

        res = await models.soloTable.do.browse();

        expect(res.payload[0].label).to.equal('farboo');

        const fouxCache = {};

        Lib.internals.cache.get = async (key) => {

            return fouxCache[key];
        };

        Lib.internals.cache.set = async (key, value) => {

            fouxCache[key] = value;
        };

        Lib.internals.broadcast = async (channel, message) => {

            expect(channel).to.equal('soloTable');
            expect(message.method).to.equal('create');
            expect(message.payload.id).to.equal('2');
            expect(message.payload.label).to.equal('farbooz');
        };

        const shelf0 = await Testlib.init(connString, {}, { caches: cacheString });

        expect(shelf0.bookshelves.default.knex).to.exist();
        expect(shelf0.knexes.default.raw).to.exist();
        expect(shelf0.models.soloTable.do).to.exist();
        expect(shelf0.models.compositeTable.do).to.exist();
        expect(shelf0.models.author.do).to.exist();
        expect(shelf0.models.book.do).to.exist();

        const server0 = Hapi.server();

        await server0.register({
            plugin: Testlib,
            options: {
                conns: connString,
                caches: cacheString
            }
        });

        const models0 = server.methods.models;

        await models0.soloTable.do.create({ label: 'farbooz' });

        res = await models0.soloTable.do.obtain({ id: 2 });

        expect(res.label).to.equal('farbooz');

        res = await models0.soloTable.do.obtain({ id: 2 });

        expect(res.label).to.equal('farbooz');

        res = await models0.soloTable.do.browse();

        expect(res.payload[1].label).to.equal('farbooz');

        res = await models0.soloTable.do.browse();

        expect(res.payload[1].label).to.equal('farbooz');

        Lib.internals.broadcast = Function.prototype;

        Lib.internals.formatters.create = async (payload, schema) => {

            payload.label = 'newlabel';

            return { payload, schema };
        };

        await models0.soloTable.do.create({ label: 'fardoo' });

        res = await models.soloTable.do.obtain({ label: 'newlabel' }, { fixer: async (payload) => payload });

        expect(res.label).to.equal('newlabel');

        Lib.internals.preRegister = async (server) => {

            server.route({ path: '/pre', method: 'get', handler: () => 'pre' });
        };

        Lib.internals.postRegister = async (server) => {

            server.route({ path: '/post', method: 'get', handler: () => 'post' });
        };

        const cache = {
            get: async (key) => {

                return fouxCache[key];
            },
            set: async (key, value) => {

                fouxCache[key] = value;
            },
            del: async (key) => {

                delete fouxCache[key];
            }
        };

        Lib.internals.models.soloTable.cache = cache;

        res = await models.soloTable.do.obtain({ label: 'newlabel' });

        expect(res.label).to.equal('newlabel');

        res = await models0.soloTable.do.browse();

        expect(res.payload[1].label).to.equal('farbooz');

        res = await models.soloTable.do.obtain({ label: 'newlabel' }, { cache });

        expect(res.label).to.equal('newlabel');

        res = await models0.soloTable.do.browse({}, { cache });

        expect(res.payload[1].label).to.equal('farbooz');

        await models0.soloTable.do.update({ id: 1 }, { is_deleted: true });

        await models0.soloTable.do.update({ id: 1 }, { is_deleted: true }, { cache });

        await models0.soloTable.do.delete({ label: 'farboo' });

        await models0.soloTable.do.delete({ label: 'farbooz' }, { cache });

        await expect(models0.cacheTest.do.delete({ label: 'farboo' })).to.reject(Error, 'No Rows Deleted');

        const zerver = Hapi.server();

        await zerver.register({
            plugin: Testlib,
            options: { conns: connString }
        });

        const preRes = await zerver.inject({ url: '/pre' });
        const postRes = await zerver.inject({ url: '/post' });

        expect(preRes.result).to.equal('pre');
        expect(postRes.result).to.equal('post');

        await shelf.bookshelves.default.knex.schema.dropTableIfExists(Schemas[3].protoProps.tableName);
        await shelf.bookshelves.default.knex.schema.dropTableIfExists(Schemas[2].protoProps.tableName);
        await shelf.bookshelves.default.knex.schema.dropTableIfExists(Schemas[1].protoProps.tableName);
        await shelf.bookshelves.default.knex.schema.dropTableIfExists(Schemas[0].protoProps.tableName);
    });
});
