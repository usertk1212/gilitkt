import svgPaths from "./svg-gkfchkbq09";

function GiliLogo() {
  return (
    <div
      className="box-border content-stretch flex flex-row gap-2 items-center justify-start p-0 relative size-full"
      data-name="Gili Logo"
    >
      <div className="h-10 relative shrink-0 w-[84.937px]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 85 40">
          <g id="Frame 15842828">
            <g id="Mask group">
              <g id="Vector">
                <path d={svgPaths.p34e84e00} fill="url(#paint0_linear_191_64)" />
                <path d={svgPaths.p21362900} fill="white" />
                <path d={svgPaths.p2a2bc00} fill="var(--fill-0, #FEDD00)" />
              </g>
            </g>
            <g id="Vector_2">
              <path d={svgPaths.p13244c00} fill="var(--fill-0, #303135)" />
              <path d={svgPaths.p354711c0} fill="var(--fill-0, #303135)" />
              <path d={svgPaths.p22a14680} fill="var(--fill-0, #303135)" />
              <path d={svgPaths.p1a2dd900} fill="var(--fill-0, #303135)" />
            </g>
          </g>
          <defs>
            <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_191_64" x1="30" x2="3.5" y1="34" y2="5.5">
              <stop stopColor="#A7CAFF" />
              <stop offset="0.360228" stopColor="#0062F6" />
              <stop offset="1" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

export default function GiliLogo1() {
  return (
    (
      <div className="bypass-link">
        <a role="link" tabIndex="0">
          Skip to main content
        </a>
      </div>
    ),
    (
      <div
        className="box-border content-stretch flex flex-row gap-2 items-center justify-start p-0 relative size-full"
        data-name="Gili Logo"
      >
        <GiliLogo />
      </div>
    )
  );
}