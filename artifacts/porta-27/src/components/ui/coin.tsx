import { useEffect, useState } from "react";

const frames = [
  "/media/ui/coin/coin_1.png",
  "/media/ui/coin/coin_2.png",
  "/media/ui/coin/coin_3.png",
  "/media/ui/coin/coin_4.png",
  "/media/ui/coin/coin_5.png",
  "/media/ui/coin/coin_6.png",
  "/media/ui/coin/coin_7.png",
  "/media/ui/coin/coin_8.png",
];

export function Coin() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setI((v) => (v + 1) % frames.length);
    }, 90);
    return () => clearInterval(t);
  }, []);

  return <img src={frames[i]} width={32} height={32} />;
}