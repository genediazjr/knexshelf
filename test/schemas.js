'use strict';

module.exports = [
    {
        name: 'soloTable',
        protoProps: {
            tableName: 'solo_table',
            withUpdatedAt: true
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
                },
                hasModel: function () {

                    if (schema.model.forge) {

                        return true;
                    }

                    return false;
                }
            };
        }
    },
    {
        name: 'book',
        protoProps: {
            tableName: 'book',
            author: function () {

                return this.belongsTo('author', 'author_id');
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
            table.biginteger('author_id');
        },
        constraints: (table) => {

            table.foreign('author_id').references('author.id');
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
    },
    {
        name: 'timestampTable',
        protoProps: {
            tableName: 'timestamp_table',
            hasTimestamps: true
        },
        columns: (table) => {

            table.string('label').notNullable();
        }
    },
    {
        name: 'nocolumnsTable',
        protoProps: {
            tableName: 'nocolumns_table',
            hasTimestamps: true
        }
    },
    {
        name: 'recurseReferenceTableA',
        protoProps: {
            tableName: 'recurse_reference_table_A',
            recurse_reference_table_B: function () {

                return this.belongsTo('recurse_reference_table_B', 'recurse_reference_table_B_id');
            }
        },
        references: {
            browse: [
                {
                    recurse_reference_table_B: function (qb) {

                        qb.column(
                            'id',
                            'name'
                        );
                    }
                }
            ],
            obtain: [
                {
                    recurse_reference_table_B: function (qb) {

                        qb.column(
                            'id',
                            'name'
                        );
                    }
                }
            ]
        },
        columns: (table) => {

            table.string('name');
            table.biginteger('recurse_reference_table_B_id');
        },
        constraints: (table) => {

            table.foreign('recurse_reference_table_B_id').references('recurse_reference_table_B.id');
        }
    },
    {
        name: 'recurseReferenceTableB',
        protoProps: {
            tableName: 'recurse_reference_table_B',
            recurse_reference_table_A: function () {

                return this.belongsTo('recurse_reference_table_A', 'recurse_reference_table_A_id');
            }
        },
        references: {
            browse: [
                {
                    recurse_reference_table_A: function (qb) {

                        qb.column(
                            'id',
                            'name'
                        );
                    }
                }
            ],
            obtain: [
                {
                    recurse_reference_table_A: function (qb) {

                        qb.column(
                            'id',
                            'name'
                        );
                    }
                }
            ]
        },
        columns: (table) => {

            table.string('name');
            table.biginteger('recurse_reference_table_A_id');
        },
        constraints: (table) => {

            table.foreign('recurse_reference_table_A_id').references('recurse_reference_table_A.id');
        }
    },
    {
        protoProps: {
            tableName: 'no_id_test',
            withUpdatedAt: true
        },
        columns: (table) => {

            table.string('code').unique();
            table.string('remarks');
        },
        formatters: {
            scrimp: async (payload, schema) => {

                return { payload, schema };
            }
        }
    }
];
