const request = require('request-promise');
const { Readable } = require('stream');
const {log, info, succes} = require('crypto-logger');
const IPFS = require('ipfs-api');

const ipfs = new IPFS({
  EXPERIMENTAL: {
    pubsub: true
  }
});

const waiting = 'waiting for next tick';

const currencies = new Map();
const symbols = new Map();
const prices = {};
class CreateObjectStream extends Readable {
  constructor(object) {
    super();
    this.push(JSON.stringify(object));
    this.push(null)
  }
  _read(data, enc, callback) {
  }
}

const createObjectStream = object => new CreateObjectStream(object)

const update = async () => {
  let changesDetected = false;
  try {
    const body = await request('https://api.coinmarketcap.com/v1/ticker/?convert=EUR&limit=0', {json: true});
    const files = [];
    log('checking for changes');
    for(const {id, symbol, price_usd, price_eur, last_updated, percent_change_24h, rank} of body) {
      const {eur, usd, updated} =  prices[symbol] || {eur: 0, usd: 0, last_updated: 0, percent_change_24h: 0} ;
      if (updated !== last_updated) {
        if (usd !== price_usd || eur !== price_eur) { // only write price updates
          changesDetected = true;
          prices[symbol] = {eur: price_eur, usd: price_usd, updated: last_updated, rank: rank, change24h: percent_change_24h};
        }
      }
      if (!symbols.has(id)) {
        symbols.set(id, symbol);
      };
    };
    files.push({
      path: 'db/prices.json',
      content: createObjectStream(prices)
    });
    files.push({
      path: 'db/symbols.json',
      content: createObjectStream(symbols)
    });
    // ipfs id off the db folder
    // 'QmRGE6LpXchjcZM5h6grF7cftqPUho5yw5Uya5M8qQF9KG'
    (async () => {
      try {
        const result = await ipfs.files.add(files);
        const published = await ipfs.name.publish(result[2].hash);
        if (changesDetected) {
          log(`coins updated: listing values ${symbols.size} coins, ${waiting}`);
        } else {
          log(`nothing to update: ${waiting}`)
        }
      } catch (e) {
        console.warn(e);
      }
    })();
  } catch (e) {
    console.log(e);
  }
}

module.exports = update;
