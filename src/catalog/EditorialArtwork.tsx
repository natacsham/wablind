import type { Element } from "./model";

/** Local vector artwork: no external requests, third-party photographs or hidden trackers. */
export function EditorialArtwork({ type }: { type: Element["illustration"] }) {
  if (type === "river")
    return (
      <g>
        <rect width="600" height="240" fill="#dae7de" />
        <circle cx="485" cy="52" r="27" fill="#f0c47c" />
        <path d="M0 146 105 48 242 150 374 64 600 143V240H0Z" fill="#789b82" />
        <path
          d="M0 190 145 128 265 177 433 108 600 153V240H0Z"
          fill="#325f52"
        />
        <path
          d="M278 138Q396 163 273 188T253 240H460Q344 207 374 194T299 138Z"
          fill="#8dc5cb"
        />
        <path
          d="M306 150Q353 165 317 178M278 211Q256 222 286 235"
          stroke="#daeeea"
          strokeWidth="3"
          fill="none"
        />
        {[45, 87, 128, 493, 542, 574].map((x, index) => (
          <g key={x} transform={`translate(${x} ${140 + (index % 3) * 14})`}>
            <path d="M0 45V0" stroke="#254536" strokeWidth="7" />
            <path d="M-21 16 0-39 21 16Z" fill="#234d3f" />
          </g>
        ))}
      </g>
    );
  if (type === "classroom")
    return (
      <g>
        <rect width="600" height="240" fill="#deebee" />
        <circle cx="505" cy="48" r="23" fill="#f2cf86" />
        <path d="M0 185Q153 158 302 185T600 183V240H0Z" fill="#9db995" />
        <rect x="118" y="65" width="318" height="140" rx="3" fill="#f7edda" />
        <path d="M101 65 275 28 453 65Z" fill="#976341" />
        {[150, 215, 280, 345].map((x) => (
          <g key={x}>
            <rect x={x} y="88" width="43" height="42" fill="#6c9ba4" />
            <path d={`M${x + 21} 88v42`} stroke="#f7edda" strokeWidth="3" />
          </g>
        ))}
        <rect x="251" y="155" width="52" height="50" fill="#365a58" />
        <path
          d="M35 207v-75m0 13q-52-21-23-53 11-42 40-15 47 4 15 55Z"
          fill="#557f59"
          stroke="#426448"
          strokeWidth="4"
        />
        <rect x="490" y="125" width="49" height="71" rx="8" fill="#4e7d98" />
        <path
          d="M490 143h49m-49 15h49m-49 15h49"
          stroke="#a4c0c8"
          strokeWidth="3"
        />
        <path d="m270 205-24 35h88l-41-35" fill="#d5c6b0" />
      </g>
    );
  if (type === "books")
    return (
      <g>
        <rect width="600" height="240" fill="#eee5d6" />
        <rect x="48" y="37" width="506" height="145" rx="3" fill="#d5b791" />
        <rect x="56" y="48" width="490" height="120" fill="#54473f" />
        {[
          ["#a54f3a", 70, 34, 104],
          ["#e2c489", 111, 30, 118],
          ["#467777", 150, 48, 105],
          ["#ae8965", 205, 29, 111],
          ["#899878", 240, 40, 97],
          ["#d08b54", 295, 31, 110],
          ["#c6b799", 340, 42, 119],
          ["#698889", 390, 32, 102],
          ["#aa594a", 435, 48, 113],
        ].map(([color, x, w, h]) => (
          <rect
            key={String(x)}
            x={Number(x)}
            y={168 - Number(h)}
            width={Number(w)}
            height={Number(h)}
            rx="2"
            fill={String(color)}
          />
        ))}
        <rect y="182" width="600" height="58" fill="#b58d63" />
        <path
          d="M182 214q58-45 118-11 58-35 115 10l-25 20q-49-27-90-14-43-13-98 15Z"
          fill="#fff9eb"
          stroke="#745d45"
          strokeWidth="2"
        />
        <path d="M300 203v16" stroke="#baaa8e" strokeWidth="2" />
        <path
          d="M501 191V139l-20-31"
          stroke="#294942"
          strokeWidth="6"
          fill="none"
        />
        <path d="m450 109 35-32 35 33Z" fill="#396958" />
      </g>
    );
  return (
    <g>
      <rect width="600" height="240" rx="2" fill="#263f44" />
      <circle cx="105" cy="110" r="77" fill="#dbaf6e" />
      <path d="M45 213q31-98 91-167-5 110-91 167" fill="#7eab94" />
      <path
        d="M49 208Q179 134 165 45"
        fill="none"
        stroke="#b7d2bd"
        strokeWidth="3"
      />
      <path
        d="m270 83 70-25v122l-70 25Zm70-25 84 27v122l-84-27Z"
        fill="#f5ead2"
      />
      <path
        d="M340 59v122m-55-77 36-13m-36 35 36-13m35-2 50 16m-50 11 50 16"
        fill="none"
        stroke="#ae8c62"
        strokeWidth="3"
      />
      <circle cx="503" cy="168" r="35" fill="#a87249" />
      <path d="m458 60 30-25 23 30-30 25Z" fill="#7eab94" />
    </g>
  );
}
