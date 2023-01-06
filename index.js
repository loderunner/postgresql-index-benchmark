const { PrismaClient } = require('@prisma/client');
const Chance = require('chance');
const consola = require('consola');

const chance = new Chance();

async function createFoos(foo, count) {
  const foos = [];
  for (let i = 0; i < count; i++) {
    foos.push({ name: chance.name() });
  }

  const startTime = new Date();
  await foo.createMany({ data: foos });
  const duration = new Date() - startTime;

  let fooIds = await foo.findMany({ select: { id: true } });
  fooIds = fooIds.map((v) => v.id);

  return [fooIds, duration];
}

async function create(bar, fooIds, count) {
  const items = [];

  for (let i = 0; i < count; i++) {
    items.push({
      label: chance.state(),
      fooId: chance.natural({ min: fooIds[0], max: fooIds[fooIds.length - 1] }),
    });
  }

  const startTime = new Date();
  await bar.createMany({ data: items });
  const duration = new Date() - startTime;

  let ids = await bar.findMany({ select: { id: true } });
  ids = ids.map((v) => v.id);

  return [ids, duration];
}

async function read(foo, barName) {
  const startTime = new Date();
  const foos = await foo.findMany({ include: { [barName]: true } });
  const duration = new Date() - startTime;

  const entityCount = foos.reduce((acc, foo) => acc + foo[barName].length, 0);

  return [foos.length, entityCount, duration];
}

async function update(bar, fooIds, itemIds) {
  const updates = [];
  for (const itemId of itemIds) {
    updates.push({
      where: {
        id: itemId,
      },
      data: {
        foo: {
          connect: {
            id: chance.natural({
              min: fooIds[0],
              max: fooIds[fooIds.length - 1],
            }),
          },
        },
      },
    });
  }

  let duration = 0;
  let count = 0;
  for (let i = 0; i < updates.length; i += 10000) {
    const batch = updates.slice(i, i + 10000);

    const startTime = new Date();
    const res = await Promise.all(batch.map((u) => bar.update(u)));
    duration += new Date() - startTime;
    count += res.length;
  }

  return [count, duration];
}

async function del(bar, toDelete) {
  const batches = [];
  for (let i = 0; i < toDelete.length; i += 10000) {
    batches.push(toDelete.slice(i, i + 10000));
  }

  const startTime = new Date();
  const res = await Promise.all(
    batches.map((b) =>
      bar.deleteMany({
        where: { id: { in: b } },
      })
    )
  );
  const duration = new Date() - startTime;

  const count = res.reduce((acc, r) => acc + r.count, 0);

  return [count, duration];
}

async function delFoos(foo) {
  const startTime = new Date();
  const res = await foo.deleteMany();
  const duration = new Date() - startTime;

  return [res.count, duration];
}

async function runBenchmark(foo, bar, barName, fooCount, barCount) {
  let duration,
    fooIds,
    barIds,
    fooReadCount,
    barReadCount,
    updateCount,
    deleteCount;
  const times = {};

  await foo.deleteMany();
  await bar.deleteMany();

  [fooIds, duration] = await createFoos(foo, fooCount);
  consola.debug(`created ${fooIds.length} foos in ${duration}ms`);

  [barIds, duration] = await create(bar, fooIds, barCount);
  times.create = duration;
  consola.debug(`created ${barIds.length} ${barName} in ${duration}ms`);

  [fooReadCount, barReadCount, duration] = await read(foo, barName);
  times.read = duration;
  consola.debug(
    `read ${fooReadCount} foos with ${barReadCount} ${barName} in ${duration}ms`
  );

  [updateCount, duration] = await update(bar, fooIds, barIds);
  times.update = duration;
  consola.debug(
    `updated ${updateCount} ${barName}-to-foos relations in ${duration}ms`
  );

  const toDelete = chance.pickset(barIds, Math.floor(barIds.length / 2));
  [deleteCount, duration] = await del(bar, toDelete);
  times.delete = duration;
  consola.debug(`deleted ${deleteCount} ${barName} in ${duration}ms`);

  [deleteCount, duration] = await delFoos(foo);
  times.deleteCascade = duration;
  consola.debug(
    `deleted ${deleteCount} foos cascading into all ${barName} in ${duration}ms`
  );

  return times;
}

async function cleanup(client) {
  await client.foo.deleteMany();
  await client.bar.deleteMany();
  await client.baz.deleteMany();
}

(async () => {
  consola.level = 'debug';

  const client = new PrismaClient({ log: ['info', 'warn', 'error'] });
  await client.$connect();

  await cleanup(client);

  const counts = [
    [10, 100],
    [10, 1000],
    [10, 1e5],
    [100, 1e5],
    [1000, 1e5],
  ];

  for (const [fooCount, barCount] of counts) {
    let times = await runBenchmark(
      client.foo,
      client.bar,
      'bars',
      fooCount,
      barCount
    );
    console.log();
    consola.success(`unindexed-${fooCount}x${barCount}`, times);
    console.log();

    times = await runBenchmark(
      client.foo,
      client.baz,
      'bazs',
      fooCount,
      barCount
    );
    console.log();
    consola.success(`indexed-${fooCount}x${barCount}`, times);
    console.log();
  }
})();
