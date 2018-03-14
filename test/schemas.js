'use strict';

module.exports = [
    {
        name: 'soloTable',
        protoProps: {
            tableName: 'solo_table'
        },
        columns: (table) => {

            table.string('label').notNullable();
        },
        constraints: (table) => {

            table.unique('label');
        },
        options: {
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
    },
    {
        name: 'compositeTable',
        protoProps: {
            tableName: 'composite_table'
        },
        columns: (table) => {

            table.bigInteger('id1');
            table.bigInteger('id2');
            table.string('text');
        },
        constraints: (table) => {

            table.primary(['id1', 'id2']);
        },
        isComposite: true
    },
    {
        name: 'author',
        protoProps: {
            tableName: 'author',
            books: function () {

                return this.hasMany('book');
            }
        },
        classProps: {
            dependents: ['books']
        },
        columns: (table) => {

            table.string('name');
        },
        queries: function (schema) {

            return {
                testing: function () {

                    return schema.name;
                }
            };
        }
    },
    {
        name: 'book',
        protoProps: {
            tableName: 'book',
            author: function () {

                return this.belongsTo('author', 'author');
            }
        },
        references: {
            browse: [
                {
                    author: function (qb) {

                        qb.column(
                            'id',
                            'name'
                        );
                    }
                }
            ],
            obtain: [
                {
                    author: function (qb) {

                        qb.column(
                            'id',
                            'name'
                        );
                    }
                }
            ]
        },
        columns: (table) => {

            table.string('title');
            table.biginteger('author');
        },
        constraints: (table) => {

            table.foreign('author').references('author.id');
        }
    },
    {
        name: 'formatterTable',
        protoProps: {
            tableName: 'formatter_table'
        },
        columns: (table) => {

            table.string('label');
        },
        formatters: {
            browse: async (query, schema) => {

                query.page = 2;
                query.perPage = 1;

                return { query, schema };
            },
            obtain: async (params, schema) => {

                params.id = 2;

                return { params, schema };
            },
            create: async (payload, schema) => {

                payload.label = 'fixed';

                return { payload, schema };
            },
            update: async (payload, params, schema) => {

                payload.label = 'updated';

                return { payload, params, schema };
            },
            delete: async (params, schema) => {

                params.id = 3;

                return { params, schema };
            }
        }
    }
];
