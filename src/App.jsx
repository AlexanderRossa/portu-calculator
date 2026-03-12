import { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const PORTU_TIERS = [
  { upTo: 500_000,   rate: 1.00 },
  { upTo: 1_000_000, rate: 0.80 },
  { upTo: 5_000_000, rate: 0.60 },
  { upTo: Infinity,  rate: 0.40 },
];
const ETF_TER = 0.20;

function portuAnnualFee(balance) {
  for (const t of PORTU_TIERS) {
    if (balance <= t.upTo) return (t.rate + ETF_TER) / 100;
  }
  return (0.40 + ETF_TER) / 100;
}

function t212AnnualFee() {
  return ETF_TER / 100;
}

function simulate(monthlyPMT, grossReturnPct, years, feeByBalance) {
  const monthlyGross = grossReturnPct / 100 / 12;
  let balance = 0;
  const yearly = [];
  for (let m = 1; m <= years * 12; m++) {
    balance += monthlyPMT;
    balance *= (1 + monthlyGross);
    balance *= (1 - feeByBalance(balance) / 12);
    if (m % 12 === 0) yearly.push(Math.round(balance));
  }
  return yearly;
}

function effectiveAnnualFee(balances) {
  const fees = balances.map(b => {
    for (const t of PORTU_TIERS) {
      if (b <= t.upTo) return t.rate;
    }
    return 0.40;
  });
  return (fees.reduce((a, b) => a + b, 0) / fees.length).toFixed(2);
}

const fmt = (v) =>
  new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v);

const MILESTONES = [10, 20, 30];

function Row({ label, val, color, big }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
      <div style={{ fontFamily: "monospace", fontSize: big ? 19 : 15, color }}>{val}</div>
    </div>
  );
}

function Slider({ label, min, max, step, value, set, display, accentColor }) {
  return (
    <div style={{ flex: 1, minWidth: 200 }}>
      <label style={{ display: "block", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#7a8494", marginBottom: 8 }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => set(+e.target.value)}
          style={{ flex: 1, accentColor }} />
        <span style={{ fontFamily: "monospace", fontSize: 16, color: accentColor, minWidth: 80, textAlign: "right" }}>
          {display}
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const [portuReturn, setPortuReturn] = useState(7);
  const [t212Return, setT212Return] = useState(7);
  const [monthly, setMonthly] = useState(2000);

  const { chartData, portuBalances, t212Balances } = useMemo(() => {
    const portuYearly = simulate(monthly, portuReturn, 30, (b) => portuAnnualFee(b));
    const t212Yearly  = simulate(monthly, t212Return,  30, () => t212AnnualFee());
    const data = portuYearly.map((p, i) => ({
      year: i + 1,
      Invested: monthly * 12 * (i + 1),
      Portu: p,
      "Trading 212": t212Yearly[i],
    }));
    return { chartData: data, portuBalances: portuYearly, t212Balances: t212Yearly };
  }, [portuReturn, t212Return, monthly]);

  const milestoneData = MILESTONES.map((y) => ({
    years: y,
    invested: monthly * 12 * y,
    portu: portuBalances[y - 1],
    t212: t212Balances[y - 1],
    gap: t212Balances[y - 1] - portuBalances[y - 1],
  }));

  const avgFee = effectiveAnnualFee(portuBalances);

  const tierLabel = (bal) => {
    for (const t of PORTU_TIERS) {
      if (bal <= t.upTo) return `${t.rate.toFixed(2)}%`;
    }
    return "0.40%";
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const portuVal = payload.find(p => p.name === "Portu")?.value;
    return (
      <div style={{ background: "#0d0f14", border: "1px solid #2a2e3a", borderRadius: 10, padding: "12px 16px", fontFamily: "monospace", fontSize: 13 }}>
        <div style={{ color: "#7a8494", marginBottom: 8, letterSpacing: "0.1em" }}>YEAR {label}</div>
        {payload.map((p) => (
          <div key={p.name} style={{ color: p.color, marginBottom: 4 }}>
            {p.name}: <strong>{fmt(p.value)}</strong>
          </div>
        ))}
        {portuVal && (
          <div style={{ color: "#9098a8", marginTop: 8, borderTop: "1px solid #1e2230", paddingTop: 8, fontSize: 12 }}>
            Portu fee tier at this point: <span style={{ color: "#c8a86a" }}>{tierLabel(portuVal)}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#090b11",
      color: "#d8d0c8",
      fontFamily: "'Georgia', serif",
      padding: "44px 24px",
      maxWidth: 900,
      margin: "0 auto",
      fontSize: 15,
    }}>
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: "#7a8494", marginBottom: 10 }}>
          Fee Impact · Tiered simulation
        </div>
        <h1 style={{ fontSize: 33, fontWeight: 400, margin: 0, color: "#ede5d8", lineHeight: 1.25 }}>
          Portu vs Trading 212 — with real tapering
        </h1>
        <p style={{ color: "#a0a8b4", marginTop: 10, fontSize: 14, lineHeight: 1.7, maxWidth: 640 }}>
          Simulate both platforms with independent gross returns and fees.
          Portu's fee is applied month-by-month with real tier thresholds.
          Trading 212 via AutoPies charges only the ETF TER.
        </p>
      </div>

      {/* Tier reference badges */}
      <div style={{ display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap" }}>
        {PORTU_TIERS.map((t, i) => (
          <div key={i} style={{
            background: "#0e1018", border: "1px solid #1e2230", borderRadius: 8,
            padding: "8px 14px", fontSize: 12, fontFamily: "monospace",
          }}>
            <span style={{ color: "#8a919e" }}>
              {t.upTo === Infinity ? ">5M Kč" : `≤${(t.upTo / 1000).toFixed(0)}k Kč`}
            </span>
            <span style={{ color: "#c8a86a", marginLeft: 8 }}>{t.rate.toFixed(2)}%</span>
          </div>
        ))}
        <div style={{
          background: "#0e1018", border: "1px dashed #2a2e3a", borderRadius: 8,
          padding: "8px 14px", fontSize: 12, fontFamily: "monospace", color: "#9098a8",
        }}>
          + {ETF_TER}% TER on both platforms
        </div>
      </div>

      {/* Sliders */}
      <div style={{ display: "flex", gap: 28, marginBottom: 36, flexWrap: "wrap" }}>
        <Slider
          label="Monthly investment (Kč)"
          min={500} max={20000} step={500}
          value={monthly} set={setMonthly}
          display={`${monthly.toLocaleString("cs-CZ")} Kč`}
          accentColor="#c8a86a"
        />
        <Slider
          label="Portu gross annual return"
          min={3} max={15} step={0.5}
          value={portuReturn} set={setPortuReturn}
          display={`${portuReturn}%`}
          accentColor="#7a9cc4"
        />
        <Slider
          label="Trading 212 gross annual return"
          min={3} max={15} step={0.5}
          value={t212Return} set={setT212Return}
          display={`${t212Return}%`}
          accentColor="#6ab87a"
        />
      </div>

      {/* Fee summary bar */}
      <div style={{
        background: "#0d0f14", border: "1px solid #1e2230", borderRadius: 10,
        padding: "16px 22px", marginBottom: 32, display: "flex", gap: 40, flexWrap: "wrap",
      }}>
        {[
          { label: "Portu avg effective platform fee", val: `${avgFee}%`, sub: "weighted across 30-year balance journey", color: "#c8a86a" },
          { label: "Trading 212 platform fee", val: "0.00%", sub: "AutoPies + ETFs, no platform charge", color: "#6ab87a" },
          { label: "Net platform fee gap (avg)", val: `${avgFee}%`, sub: "excludes any difference in gross returns", color: "#c87a7a" },
        ].map(item => (
          <div key={item.label}>
            <div style={{ fontSize: 11, color: "#7a8494", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontFamily: "monospace", fontSize: 24, color: item.color }}>{item.val}<span style={{ fontSize: 13, color: "#9098a8" }}>/yr</span></div>
            <div style={{ fontSize: 12, color: "#7a8494", marginTop: 2 }}>{item.sub}</div>
          </div>
        ))}
      </div>

      {/* Milestone cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 40 }}>
        {milestoneData.map(({ years, invested, portu, t212, gap }) => {
          const portuWins = gap < 0;
          const absgap = Math.abs(gap);
          const winner = portuWins ? "Portu" : "Trading 212";
          const winnerColor = portuWins ? "#7a9cc4" : "#6ab87a";
          const base = portuWins ? portu : t212;
          return (
            <div key={years} style={{
              background: "#0e1018", border: "1px solid #1e2230", borderRadius: 12,
              padding: "22px 18px", position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg, ${winnerColor}, ${portuWins ? "#6ab87a" : "#7a9cc4"})`,
              }} />
              <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#7a8494", marginBottom: 18 }}>
                After {years} years
              </div>
              <Row label="Total invested" val={fmt(invested)} color="#8a919e" />
              <Row label="Portu" val={fmt(portu)} color="#7a9cc4" big />
              <div style={{ fontSize: 11, color: "#7a8494", marginTop: -8, marginBottom: 12 }}>
                (fee tier at end: <span style={{ color: "#c8a86a" }}>{tierLabel(portu)}</span>)
              </div>
              <Row label="Trading 212" val={fmt(t212)} color="#6ab87a" big />
              <div style={{ borderTop: "1px solid #1e2230", paddingTop: 14, marginTop: 4 }}>
                <div style={{ fontSize: 11, color: winnerColor, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  {winner} wins by
                </div>
                <div style={{ fontFamily: "monospace", fontSize: 24, color: winnerColor, marginTop: 2 }}>
                  {fmt(absgap)}
                </div>
                <div style={{ fontSize: 12, color: "#7a8494", marginTop: 3 }}>
                  = {((absgap / base) * 100).toFixed(1)}% of {winner} final value
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div style={{ background: "#0d0f14", border: "1px solid #1a1e28", borderRadius: 12, padding: "24px 8px 16px" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#7a8494", paddingLeft: 16, marginBottom: 20 }}>
          Portfolio growth · hover to see active fee tier
        </div>
        <ResponsiveContainer width="100%" height={310}>
          <AreaChart data={chartData} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
            <defs>
              {[["gT212", "#6ab87a"], ["gPortu", "#7a9cc4"], ["gInv", "#3a4050"]].map(([id, col]) => (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={col} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={col} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="#141820" strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fill: "#6a7484", fontSize: 12 }} tickLine={false} axisLine={false}
              label={{ value: "Years", fill: "#6a7484", fontSize: 11, position: "insideBottomRight", offset: -8 }} />
            <YAxis
              tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}k`}
              tick={{ fill: "#6a7484", fontSize: 12 }} tickLine={false} axisLine={false} width={52} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 13, color: "#9098a8", paddingTop: 14 }} />
            <Area type="monotone" dataKey="Invested" stroke="#2a3040" strokeWidth={1.5} fill="url(#gInv)" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="Portu" stroke="#7a9cc4" strokeWidth={2} fill="url(#gPortu)" />
            <Area type="monotone" dataKey="Trading 212" stroke="#6ab87a" strokeWidth={2} fill="url(#gT212)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p style={{ fontSize: 12, color: "#6a7484", lineHeight: 1.8, borderTop: "1px solid #1e2230", paddingTop: 16, marginTop: 24 }}>
        Simulation is month-by-month compound growth with fee applied on the balance after each month's return.
        Portu's fee tier shifts automatically as the balance crosses 500k / 1M / 5M Kč thresholds.
        Trading 212 assumes zero platform fee with only the 0.20% ETF TER. Not financial advice.
      </p>
    </div>
  );
}
