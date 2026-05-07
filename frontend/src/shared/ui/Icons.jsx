function IconBase({
  children,
  size = 20,
  className = "",
  viewBox,
  fill = "none",
  stroke = "currentColor",
  strokeWidth = 1.8,
  ...props
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={viewBox}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props) {
  return (
    <IconBase viewBox="0 0 24 24" fill="none" stroke="none" {...props}>
      <path
        d="M12 11.75C12.4142 11.75 12.75 11.4142 12.75 11C12.75 10.5858 12.4142 10.25 12 10.25V11.75ZM5 10.25C4.58579 10.25 4.25 10.5858 4.25 11C4.25 11.4142 4.58579 11.75 5 11.75V10.25ZM12 10.25C11.5858 10.25 11.25 10.5858 11.25 11C11.25 11.4142 11.5858 11.75 12 11.75V10.25ZM19 11.75C19.4142 11.75 19.75 11.4142 19.75 11C19.75 10.5858 19.4142 10.25 19 10.25V11.75ZM11.25 11C11.25 11.4142 11.5858 11.75 12 11.75C12.4142 11.75 12.75 11.4142 12.75 11H11.25ZM12.75 5C12.75 4.58579 12.4142 4.25 12 4.25C11.5858 4.25 11.25 4.58579 11.25 5H12.75ZM5.75 11C5.75 10.5858 5.41421 10.25 5 10.25C4.58579 10.25 4.25 10.5858 4.25 11H5.75ZM19.75 11C19.75 10.5858 19.4142 10.25 19 10.25C18.5858 10.25 18.25 10.5858 18.25 11H19.75ZM4.25 11C4.25 11.4142 4.58579 11.75 5 11.75C5.41421 11.75 5.75 11.4142 5.75 11H4.25ZM12 5.75C12.4142 5.75 12.75 5.41421 12.75 5C12.75 4.58579 12.4142 4.25 12 4.25V5.75ZM18.25 11C18.25 11.4142 18.5858 11.75 19 11.75C19.4142 11.75 19.75 11.4142 19.75 11H18.25ZM12 4.25C11.5858 4.25 11.25 4.58579 11.25 5C11.25 5.41421 11.5858 5.75 12 5.75V4.25ZM12 10.25H5V11.75H12V10.25ZM12 11.75H19V10.25H12V11.75ZM12.75 11V5H11.25V11H12.75ZM4.25 11V15H5.75V11H4.25ZM4.25 15C4.25 17.6234 6.37665 19.75 9 19.75V18.25C7.20507 18.25 5.75 16.7949 5.75 15H4.25ZM9 19.75H15V18.25H9V19.75ZM15 19.75C17.6234 19.75 19.75 17.6234 19.75 15H18.25C18.25 16.7949 16.7949 18.25 15 18.25V19.75ZM19.75 15V11H18.25V15H19.75ZM5.75 11V9H4.25V11H5.75ZM5.75 9C5.75 7.20507 7.20507 5.75 9 5.75V4.25C6.37665 4.25 4.25 6.37665 4.25 9H5.75ZM9 5.75H12V4.25H9V5.75ZM19.75 11V9H18.25V11H19.75ZM19.75 9C19.75 6.37665 17.6234 4.25 15 4.25V5.75C16.7949 5.75 18.25 7.20507 18.25 9H19.75ZM15 4.25H12V5.75H15V4.25Z"
        fill="currentColor"
      />
    </IconBase>
  );
}

export function TravelIcon(props) {
  return (
    <IconBase viewBox="0 0 14 19" fill="currentColor" stroke="none" {...props}>
      <path d="M12.382 5.304 10.096 7.59l.006.02L11.838 14a.908.908 0 0 1-.211.794l-.573.573a.339.339 0 0 1-.566-.08l-2.348-4.25-.745-.746-1.97 1.97a3.311 3.311 0 0 1-.75.504l.44 1.447a.875.875 0 0 1-.199.79l-.175.176a.477.477 0 0 1-.672 0l-1.04-1.039-.018-.02-.788-.786-.02-.02-1.038-1.039a.477.477 0 0 1 0-.672l.176-.176a.875.875 0 0 1 .79-.197l1.447.438a3.322 3.322 0 0 1 .504-.75l1.97-1.97-.746-.744-4.25-2.348a.339.339 0 0 1-.08-.566l.573-.573a.909.909 0 0 1 .794-.211l6.39 1.736.02.006 2.286-2.286c.37-.372 1.621-1.02 1.993-.65.37.372-.279 1.622-.65 1.993z" />
    </IconBase>
  );
}

export function ClientsIcon(props) {
  return (
    <IconBase viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </IconBase>
  );
}

export function SalesIcon(props) {
  return (
    <IconBase viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 17v1" strokeLinecap="round" />
      <path d="M12 6v1" strokeLinecap="round" />
      <path
        d="M15 9.5C15 8.11929 13.6569 7 12 7C10.3431 7 9 8.11929 9 9.5C9 10.8807 10.3431 12 12 12C13.6569 12 15 13.1193 15 14.5C15 15.8807 13.6569 17 12 17C10.3431 17 9 15.8807 9 14.5"
        strokeLinecap="round"
      />
      <path
        d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7"
        strokeLinecap="round"
      />
    </IconBase>
  );
}

export function ReportsIcon(props) {
  return (
    <IconBase
      viewBox="0 0 512 512"
      fill="currentColor"
      stroke="none"
      {...props}
    >
      <path d="M256-2C114.609-2,0,112.609,0,254s114.609,256,256,256s256-114.609,256-256S397.391-2,256-2zM256,470c-119.297,0-216-96.703-216-216S136.703,38,256,38s216,96.703,216,216S375.297,470,256,470z" />
      <path d="M349.328,142H162.664C152.359,142,144,150.359,144,160.656v122.672c0,10.312,8.359,18.672,18.664,18.672H176v64l37.336-64h135.992c10.312,0,18.672-8.359,18.672-18.672V160.656C368,150.359,359.641,142,349.328,142zM336,270h-96v-16h96V270zM336,222H176v-16h160V222zM336,190H176v-16h160V190z" />
    </IconBase>
  );
}

export function SoldIcon(props) {
  return (
    <IconBase viewBox="0 0 1024 1024" fill="none" {...props}>
      <path
        fill="#000000"
        d="M704 288h131.072a32 32 0 0 1 31.808 28.8L886.4 512h-64.384l-16-160H704v96a32 32 0 1 1-64 0v-96H384v96a32 32 0 0 1-64 0v-96H217.92l-51.2 512H512v64H131.328a32 32 0 0 1-31.808-35.2l57.6-576a32 32 0 0 1 31.808-28.8H320v-22.336C320 154.688 405.504 64 512 64s192 90.688 192 201.664v22.4zm-64 0v-22.336C640 189.248 582.272 128 512 128c-70.272 0-128 61.248-128 137.664v22.4h256zm201.408 476.16a32 32 0 1 1 45.248 45.184l-128 128a32 32 0 0 1-45.248 0l-128-128a32 32 0 1 1 45.248-45.248L704 837.504V608a32 32 0 1 1 64 0v229.504l73.408-73.408z"
      />
    </IconBase>
  );
}

export function RevenueIcon(props) {
  return (
    <IconBase viewBox="0 0 1024 1024" fill="#000000" {...props}>
      <path d="M136.948 908.811c5.657 0 10.24-4.583 10.24-10.24V610.755c0-5.657-4.583-10.24-10.24-10.24h-81.92a10.238 10.238 0 00-10.24 10.24v287.816c0 5.657 4.583 10.24 10.24 10.24h81.92zm0 40.96h-81.92c-28.278 0-51.2-22.922-51.2-51.2V610.755c0-28.278 22.922-51.2 51.2-51.2h81.92c28.278 0 51.2 22.922 51.2 51.2v287.816c0 28.278-22.922 51.2-51.2 51.2zm278.414-40.96c5.657 0 10.24-4.583 10.24-10.24V551.322c0-5.657-4.583-10.24-10.24-10.24h-81.92a10.238 10.238 0 00-10.24 10.24v347.249c0 5.657 4.583 10.24 10.24 10.24h81.92zm0 40.96h-81.92c-28.278 0-51.2-22.922-51.2-51.2V551.322c0-28.278 22.922-51.2 51.2-51.2h81.92c28.278 0 51.2 22.922 51.2 51.2v347.249c0 28.278-22.922 51.2-51.2 51.2zm278.414-40.342c5.657 0 10.24-4.583 10.24-10.24V492.497c0-5.651-4.588-10.24-10.24-10.24h-81.92c-5.652 0-10.24 4.589-10.24 10.24v406.692c0 5.657 4.583 10.24 10.24 10.24h81.92zm0 40.96h-81.92c-28.278 0-51.2-22.922-51.2-51.2V492.497c0-28.271 22.924-51.2 51.2-51.2h81.92c28.276 0 51.2 22.929 51.2 51.2v406.692c0 28.278-22.922 51.2-51.2 51.2zm278.414-40.958c5.657 0 10.24-4.583 10.24-10.24V441.299c0-5.657-4.583-10.24-10.24-10.24h-81.92a10.238 10.238 0 00-10.24 10.24v457.892c0 5.657 4.583 10.24 10.24 10.24h81.92zm0 40.96h-81.92c-28.278 0-51.2-22.922-51.2-51.2V441.299c0-28.278 22.922-51.2 51.2-51.2h81.92c28.278 0 51.2 22.922 51.2 51.2v457.892c0 28.278-22.922 51.2-51.2 51.2zm-6.205-841.902C677.379 271.088 355.268 367.011 19.245 387.336c-11.29.683-19.889 10.389-19.206 21.679s10.389 19.889 21.679 19.206c342.256-20.702 670.39-118.419 964.372-284.046 9.854-5.552 13.342-18.041 7.79-27.896s-18.041-13.342-27.896-7.79z" />
      <path d="M901.21 112.64l102.39.154c11.311.017 20.494-9.138 20.511-20.449s-9.138-20.494-20.449-20.511l-102.39-.154c-11.311-.017-20.494 9.138-20.511 20.449s9.138 20.494 20.449 20.511z" />
      <path d="M983.151 92.251l-.307 101.827c-.034 11.311 9.107 20.508 20.418 20.542s20.508-9.107 20.542-20.418l.307-101.827c.034-11.311-9.107-20.508-20.418-20.542s-20.508 9.107-20.542 20.418z" />
    </IconBase>
  );
}

export function LossIcon(props) {
  return (
    <IconBase viewBox="0 0 1024 1024" fill="#000000" {...props}>
      <path d="M925.9 804l-24-199.2c-.8-6.6-8.9-9.4-13.6-4.7L829 659.5 557.7 388.3c-6.3-6.2-16.4-6.2-22.6 0L433.3 490 156.6 213.3a8.03 8.03 0 0 0-11.3 0l-45 45.2a8.03 8.03 0 0 0 0 11.3L422 591.7c6.2 6.3 16.4 6.3 22.6 0L546.4 490l226.1 226-59.3 59.3a8.01 8.01 0 0 0 4.7 13.6l199.2 24c5.1.7 9.5-3.7 8.8-8.9z" />
    </IconBase>
  );
}

export function CatalogIcon(props) {
  return (
    <IconBase viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M4 6h16M4 10h16M4 14h8M4 18h8" strokeLinecap="round" />
      <circle cx="18" cy="16" r="3" />
      <path d="m21 19 1.5 1.5" strokeLinecap="round" />
    </IconBase>
  );
}

export function UsersIcon(props) {
  return (
    <IconBase viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 8v6M22 11h-6" strokeLinecap="round" />
    </IconBase>
  );
}

export function AnalyticsIcon(props) {
  return (
    <IconBase viewBox="0 0 24 24" fill="none" {...props}>
      <path
        stroke="#000000"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M8 16v-5m4 5V8m4 8v-2m2-10H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"
      />
    </IconBase>
  );
}

export function SalesReportIcon(props) {
  return (
    <IconBase viewBox="0 0 48 48" fill="none" {...props}>
      <path
        d="M41 13.9997L24 4L7 13.9997L7 33.9998L24 44L41 33.9998V13.9997Z"
        fill="#2F88FF"
        stroke="#000000"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M24 22V30"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 18V30"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 26V30"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}

export function SummaryIcon({ tone = "" }) {
  return (
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 ${tone}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path
          d="M5 19h14M7 16V9M12 16V5M17 16v-3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function RevenueSummaryIcon(props) {
  return (
    <IconBase viewBox="0 0 48 48" fill="none" {...props}>
      <path d="M44,7.1V14a2,2,0,0,1-2,2H35a2,2,0,0,1-2-2.3A2.1,2.1,0,0,1,35.1,12h2.3A18,18,0,0,0,6.1,22.2a2,2,0,0,1-2,1.8h0a2,2,0,0,1-2-2.2A22,22,0,0,1,40,8.9V7a2,2,0,0,1,2.3-2A2.1,2.1,0,0,1,44,7.1Z" />
      <path d="M4,40.9V34a2,2,0,0,1,2-2h7a2,2,0,0,1,2,2.3A2.1,2.1,0,0,1,12.9,36H10.6A18,18,0,0,0,41.9,25.8a2,2,0,0,1,2-1.8h0a2,2,0,0,1,2,2.2A22,22,0,0,1,8,39.1V41a2,2,0,0,1-2.3,2A2.1,2.1,0,0,1,4,40.9Z" />
      <path d="M24.7,22c-3.5-.7-3.5-1.3-3.5-1.8s.2-.6.5-.9a3.4,3.4,0,0,1,1.8-.4,6.3,6.3,0,0,1,3.3.9,1.8,1.8,0,0,0,2.7-.5,1.9,1.9,0,0,0-.4-2.8A9.1,9.1,0,0,0,26,15.3V13a2,2,0,0,0-4,0v2.2c-3,.5-5,2.5-5,5.2s3.3,4.9,6.5,5.5,3.3,1.3,3.3,1.8-1.1,1.4-2.5,1.4h0a6.7,6.7,0,0,1-4.1-1.3,2,2,0,0,0-2.8.6,1.8,1.8,0,0,0,.3,2.6A10.9,10.9,0,0,0,22,32.8V35a2,2,0,0,0,4,0V32.8a6.3,6.3,0,0,0,3-1.3,4.9,4.9,0,0,0,2-4h0C31,23.8,27.6,22.6,24.7,22Z" />
    </IconBase>
  );
}

export function AverageBillIcon(props) {
  return (
    <IconBase viewBox="0 0 32 32" fill="none" {...props}>
      <path
        d="M10 4h9l5 5v17a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M19 4v5h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 14h8M12 18h8M12 22h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10 13h5v5h-5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}

export function SalesLossIcon(props) {
  return (
    <IconBase viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M16.5 14.5L12.3 10.3L10.7 12.7L7.5 9.5"
        stroke="#292D32"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 14.5H16.5V12.5"
        stroke="#292D32"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z"
        stroke="#292D32"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}
