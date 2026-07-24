import svgPaths from "./svg-03q0atlwfv";
import { imgEllipse176 } from "./svg-bsnud";

function GiliLogo() {
  return (
    <div
      className="box-border content-stretch flex flex-row gap-2 items-center justify-start p-0 relative size-full"
      data-name="Gili Logo"
    >
      <div className="box-border content-stretch flex flex-row items-center justify-between px-0 py-1 relative shrink-0 w-[84.937px]">
        <div className="relative shrink-0 size-8">
          <div className="absolute bottom-[-1.56%] left-0 right-0 rounded-[7.467px] top-[1.56%]" />
          <div className="absolute bottom-[-1.56%] contents left-0 right-0 top-[1.56%]" data-name="Mask group">
            <div className="absolute flex inset-[-18.84%_-34.41%_49.3%_66.03%] items-center justify-center mix-blend-soft-light">
              <div className="flex-none h-[17.388px] rotate-[40.643deg] w-[13.911px]">
                <div
                  className="mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-21.129px_6.53px] mask-size-[32px_32px] relative size-full"
                  style={{ maskImage: `url('${imgEllipse176}')` }}
                >
                  <div className="absolute inset-[-57.51%_-71.89%]">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 34 38">
                      <g filter="url(#filter0_f_191_35)" id="Ellipse 176" style={{ mixBlendMode: "soft-light" }}>
                        <ellipse cx="16.9552" cy="18.694" fill="var(--fill-0, white)" rx="6.95523" ry="8.69404" />
                      </g>
                      <defs>
                        <filter
                          colorInterpolationFilters="sRGB"
                          filterUnits="userSpaceOnUse"
                          height="37.3881"
                          id="filter0_f_191_35"
                          width="33.9105"
                          x="0"
                          y="0"
                        >
                          <feFlood floodOpacity="0" result="BackgroundImageFix" />
                          <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
                          <feGaussianBlur result="effect1_foregroundBlur_191_35" stdDeviation="5" />
                        </filter>
                      </defs>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute inset-[20.31%_18.75%_17.19%_15.63%]" data-name="Subtract">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 21 20">
              <path d={svgPaths.p141fd800} fill="var(--fill-0, white)" id="Subtract" />
            </svg>
          </div>
          <div className="absolute inset-[43.75%_21.88%_21.88%_43.75%]" data-name="Vector">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11 11">
              <path d={svgPaths.p32f47d00} fill="var(--fill-0, #FEDD00)" id="Vector" />
            </svg>
          </div>
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