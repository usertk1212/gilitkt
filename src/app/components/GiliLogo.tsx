import svgPaths from "../imports/svg-t2d7jeegnz";

interface GiliLogoProps {
  collapsed?: boolean;
}

export function GiliLogo({ collapsed = false }: GiliLogoProps) {
  if (collapsed) {
    // Show only the icon part when collapsed - extracting just the logo mark
    return (
      <div className="relative shrink-0 size-8">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
          <g id="Mask group">
            <g id="Vector">
              <path d={svgPaths.p2f115e00} fill="url(#paint0_linear_191_92)" />
              <path d={svgPaths.p138b02f0} fill="white" />
              <path d={svgPaths.p21423c00} fill="var(--fill-0, #FEDD00)" />
            </g>
          </g>
          <defs>
            <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_191_92" x1="30" x2="3.5" y1="30" y2="1.5">
              <stop stopColor="#A7CAFF" />
              <stop offset="0.360228" stopColor="#0062F6" />
              <stop offset="1" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  // Show full logo when expanded
  return (
    <div
      className="box-border content-stretch flex flex-row gap-2 items-center justify-start p-0 relative size-full"
      data-name="Gili Logo"
    >
      <div className="relative shrink-0 size-8" data-name="Mask group">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
          <g id="Mask group">
            <g id="Vector">
              <path d={svgPaths.p2f115e00} fill="url(#paint0_linear_191_92)" />
              <path d={svgPaths.p138b02f0} fill="white" />
              <path d={svgPaths.p21423c00} fill="var(--fill-0, #FEDD00)" />
            </g>
          </g>
          <defs>
            <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_191_92" x1="30" x2="3.5" y1="30" y2="1.5">
              <stop stopColor="#A7CAFF" />
              <stop offset="0.360228" stopColor="#0062F6" />
              <stop offset="1" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="h-[22.38px] relative shrink-0 w-[44.937px]" data-name="Vector">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 45 23">
          <g id="Vector">
            <path d={svgPaths.p304c980} fill="var(--fill-0, #303135)" />
            <path d={svgPaths.pd5f0000} fill="var(--fill-0, #303135)" />
            <path d={svgPaths.p310a0100} fill="var(--fill-0, #303135)" />
            <path d={svgPaths.p3d9d3280} fill="var(--fill-0, #303135)" />
          </g>
        </svg>
      </div>
    </div>
  );
}