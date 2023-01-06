const { PrismaClient } = require('@prisma/client');
const Chance = require('chance');
const consola = require('consola');
const fs = require('fs/promises');

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

async function delFoos(foo, fooIds) {
  const startTime = new Date();
  const res = await Promise.all(
    fooIds.map((fooId) => foo.delete({ where: { id: fooId } }))
  );
  const duration = new Date() - startTime;

  return [res.length, duration];
}

async function runSingleBenchmark(foo, bar, barName, fooCount, barCount) {
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

  [deleteCount, duration] = await delFoos(foo, fooIds);
  times.deleteCascade = duration;
  consola.debug(
    `deleted ${deleteCount} foos cascading into all ${barName} in ${duration}ms`
  );

  return times;
}

async function runBenchmark(...args) {
  const numberOfRuns = 10;
  const times = [];
  for (let i = 0; i < numberOfRuns; i++) {
    times.push(await runSingleBenchmark(...args));
  }

  const benchmark = {};
  for (const t of times) {
    for (const [k, v] of Object.entries(t)) {
      benchmark[k] = benchmark[k] ? [...benchmark[k], v] : [v];
    }
  }

  for (const [k, arr] of Object.entries(benchmark)) {
    benchmark[k] = {
      min: Math.min(...arr),
      avg: arr.reduce((acc, v) => acc + v, 0) / arr.length,
      max: Math.max(...arr),
    };
  }

  return benchmark;
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

  const results = {};
  for (const [fooCount, barCount] of counts) {
    const unindexedKey = `unindexed-${fooCount}x${barCount}`;
    let times = await runBenchmark(
      client.foo,
      client.bar,
      'bars',
      fooCount,
      barCount
    );
    results[unindexedKey] = times;
    console.log();
    consola.success(unindexedKey, times);
    console.log();

    const indexedKey = `indexed-${fooCount}x${barCount}`;
    times = await runBenchmark(
      client.foo,
      client.baz,
      'bazs',
      fooCount,
      barCount
    );
    results[indexedKey] = times;
    console.log();
    consola.success(indexedKey, times);
    console.log();
  }

  await fs.writeFile('results.json', JSON.stringify(results));
})();
