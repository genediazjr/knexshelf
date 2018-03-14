'use strict';

module.exports = (barrel) => {

    const methods = {};

    methods.testing = async () => {

        await barrel.models.soloTable.do.create({ label: 'methodtest' });
        await barrel.models.author.do.create({ name: 'rowling' });

        const res1 = await barrel.models.soloTable.do.obtain({ id: 1 });
        const res2 = await barrel.models.author.do.obtain({ id: 1 });
        const res = `${res1.label}${res2.name}`;

        await barrel.models.soloTable.do.delete({ label: 'methodtest' });
        await barrel.models.author.do.delete({ name: 'rowling' });

        return res;
    };

    methods.testing.options = {
        cache: {
            expiresIn: 2000,
            generateTimeout: 100
        },
        generateKey: () => {

            return 'testing';
        }
    };

    return methods;
};
