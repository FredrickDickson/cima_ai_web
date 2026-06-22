const EASE = {
  entry: "back.out(2.4)", // bouncy slam-pop
  emphasis: "expo.out", // hard arrival
  exit: "power4.in", // dive off
  drift: "sine.inOut", // only for ambient breathing
};
const DUR = {
  snap: 0.18,
  med: 0.45,
  slow: 0.9,
};
// RULE: never ease-in-out for primary motion. Hit-and-stick.
