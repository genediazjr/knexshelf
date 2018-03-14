'use strict';

module.exports = (shelf) => {

    const methods = {};

    methods.testing = async () => {

        await shelf.models.soloTable.do.create({ label: 'methodtest' });
        await shelf.models.author.do.create({ name: 'rowling' });

        const res1 = await shelf.models.soloTable.do.obtain({ id: 1 });
        const res2 = await shelf.models.author.do.obtain({ id: 1 });
        const res = `${res1.label}${res2.name}`;

        await shelf.models.soloTable.do.delete({ label: 'methodtest' });
        await shelf.models.author.do.delete({ name: 'rowling' });

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
