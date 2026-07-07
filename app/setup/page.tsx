"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import DexTopBar from "@/components/DexTopBar";
import DexBottomBar from "@/components/DexBottomBar";

const US_STATES = [
  ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],
  ["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["FL","Florida"],["GA","Georgia"],
  ["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],
  ["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],
  ["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],
  ["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],
  ["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],
  ["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],
  ["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],
  ["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"],
];

// eBird-compatible ISO 3166-1 alpha-2 country codes
const COUNTRIES: [string, string][] = [
  ["US","United States"],
  ["CA","Canada"],
  ["MX","Mexico"],
  ["GB","United Kingdom"],
  ["AU","Australia"],
  ["NZ","New Zealand"],
  ["IE","Ireland"],
  ["FR","France"],
  ["ES","Spain"],
  ["PT","Portugal"],
  ["DE","Germany"],
  ["NL","Netherlands"],
  ["BE","Belgium"],
  ["CH","Switzerland"],
  ["AT","Austria"],
  ["IT","Italy"],
  ["GR","Greece"],
  ["TR","Turkey"],
  ["NO","Norway"],
  ["SE","Sweden"],
  ["DK","Denmark"],
  ["FI","Finland"],
  ["IS","Iceland"],
  ["PL","Poland"],
  ["CZ","Czech Republic"],
  ["HU","Hungary"],
  ["RO","Romania"],
  ["UA","Ukraine"],
  ["RU","Russia"],
  ["IL","Israel"],
  ["JO","Jordan"],
  ["AE","United Arab Emirates"],
  ["SA","Saudi Arabia"],
  ["IN","India"],
  ["LK","Sri Lanka"],
  ["NP","Nepal"],
  ["BT","Bhutan"],
  ["CN","China"],
  ["JP","Japan"],
  ["KR","South Korea"],
  ["TW","Taiwan"],
  ["TH","Thailand"],
  ["MY","Malaysia"],
  ["SG","Singapore"],
  ["ID","Indonesia"],
  ["PH","Philippines"],
  ["VN","Vietnam"],
  ["KH","Cambodia"],
  ["MM","Myanmar"],
  ["PG","Papua New Guinea"],
  ["KE","Kenya"],
  ["TZ","Tanzania"],
  ["UG","Uganda"],
  ["ET","Ethiopia"],
  ["ZA","South Africa"],
  ["NA","Namibia"],
  ["BW","Botswana"],
  ["ZW","Zimbabwe"],
  ["MZ","Mozambique"],
  ["GH","Ghana"],
  ["SN","Senegal"],
  ["MA","Morocco"],
  ["EG","Egypt"],
  ["BR","Brazil"],
  ["CO","Colombia"],
  ["EC","Ecuador"],
  ["PE","Peru"],
  ["BO","Bolivia"],
  ["CL","Chile"],
  ["AR","Argentina"],
  ["CR","Costa Rica"],
  ["PA","Panama"],
  ["GT","Guatemala"],
  ["BZ","Belize"],
  ["CU","Cuba"],
];

export default function SetupPage() {
  const { user } = useUser();
  const router = useRouter();
  const [country, setCountry] = useState("US");
  const [state, setState] = useState("NY");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedCountry = localStorage.getItem("birddex_country");
    const storedState = localStorage.getItem("birddex_state");
    if (storedCountry) setCountry(storedCountry);
    if (storedState) setState(storedState);
  }, []);

  function save() {
    localStorage.setItem("birddex_country", country);
    if (country === "US") localStorage.setItem("birddex_state", state);
    setSaved(true);
    setTimeout(() => router.push("/"), 800);
  }

  const locationLabel = country === "US"
    ? `${US_STATES.find(([c]) => c === state)?.[1] || state}, US`
    : COUNTRIES.find(([c]) => c === country)?.[1] || country;

  return (
    <div className="flex flex-col h-full">
      <DexTopBar />
      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="text-center pt-4">
          <p className="font-pixel text-[var(--dex-green)] text-xs leading-relaxed">
            SET YOUR LOCATION<br/>TO LOAD LOCAL BIRDS
          </p>
        </div>

        {user && (
          <div className="bg-[#161b22] border border-gray-700 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--dex-red)] flex items-center justify-center">
              <span className="text-white font-pixel text-xs">{user.firstName?.[0] || "T"}</span>
            </div>
            <div>
              <p className="text-white text-sm font-medium">{user.fullName || "Trainer"}</p>
              <p className="text-gray-500 text-xs">{user.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
        )}

        <div className="bg-[#161b22] border border-gray-700 rounded-xl p-4 space-y-3">
          <p className="font-pixel text-xs text-gray-400">COUNTRY</p>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2.5 text-gray-200 text-sm outline-none focus:border-[var(--dex-green)]"
          >
            {COUNTRIES.map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>

          {country === "US" && (
            <>
              <p className="font-pixel text-xs text-gray-400">STATE</p>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2.5 text-gray-200 text-sm outline-none focus:border-[var(--dex-green)]"
              >
                {US_STATES.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </>
          )}

          <p className="text-xs text-gray-600">
            Your BirdDex will be populated with birds recorded in {locationLabel} by eBird.
          </p>
        </div>

        <button
          onClick={save}
          className={`w-full py-3 rounded-xl font-pixel text-xs transition-colors border-b-4
            ${saved
              ? "bg-green-700 border-green-900 text-white"
              : "bg-[var(--dex-red)] border-[var(--dex-red-dark)] text-white"}`}
        >
          {saved ? "✓ SAVED! LOADING DEX..." : "SAVE LOCATION"}
        </button>
      </main>
      <DexBottomBar />
    </div>
  );
}
