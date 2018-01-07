const update = require('./lib/update');
let counter = 0;

const inminutes = min => {
  return (Number(min) * 60000)
}

const inhours = hours => {
  return (Number(hours) * 60) * inminutes(1)
}

const timeout = () => setTimeout(() => {
  counter += 1;
  update().then(() => {
    if (counter === 15) counter = 0;
    timeout();
  });
}, inminutes(0.5));

(async () => {
  await update();
  return timeout();
})()
