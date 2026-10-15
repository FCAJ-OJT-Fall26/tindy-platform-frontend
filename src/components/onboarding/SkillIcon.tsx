import React from "react"

interface SkillIconProps {
  name: string
  size?: number
  className?: string
}

export const SkillIcon: React.FC<SkillIconProps> = ({
  name,
  size = 15,
  className = "",
}) => {
  const norm = name.trim().toLowerCase()

  const svgProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    className: `skill-brand-icon ${className}`.trim(),
    "aria-hidden": "true" as const,
  }

  // 1. .NET / ASP.NET
  if (norm === ".net" || norm === "dotnet") {
    return (
      <svg {...svgProps}>
        <rect width="24" height="24" rx="4" fill="#512BD4" />
        <path
          d="M5 14.5V9.5h1.8l2 3.2V9.5h1.2v5H8.2L6.2 11.3v3.2H5zm7.3-3.6c0-1 .7-1.5 1.8-1.5 1 0 1.7.5 1.7 1.5v.4h-2.3c0 .5.3.8.8.8.4 0 .7-.2.8-.5h1.2c-.2.8-.9 1.3-2 1.3-1.3 0-2.1-.9-2.1-2.1zm2.3-.4c0-.4-.3-.6-.7-.6s-.7.2-.7.6h1.4zm3.8-1h1.2v.9h-1.2v2.3c0 .3.1.5.4.5.3 0 .5-.1.6-.2v.9c-.3.1-.7.2-1.1.2-.9 0-1.3-.5-1.3-1.3v-2.4H17V9.5h.4v-.9l1-.3v1.2z"
          fill="#FFFFFF"
        />
      </svg>
    )
  }

  // 2. ASP.NET Core
  if (norm.includes("asp.net") || norm === "aspnetcore") {
    return (
      <svg {...svgProps}>
        <rect width="24" height="24" rx="4" fill="#512BD4" />
        <circle cx="12" cy="12" r="7" stroke="#FFFFFF" strokeWidth="1.8" />
        <path d="M12 7.5v9M7.5 12h9" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="12" r="2.2" fill="#FFFFFF" />
      </svg>
    )
  }

  // 3. C#
  if (norm === "c#" || norm === "csharp" || norm === "c sharp") {
    return (
      <svg {...svgProps}>
        <rect width="24" height="24" rx="4" fill="#239120" />
        <path
          d="M11.5 14.2c-.7.6-1.6.9-2.5.9-2.2 0-3.8-1.6-3.8-3.7s1.6-3.7 3.8-3.7c.9 0 1.8.3 2.5.9l.8-1.1C11.3 6.6 10.2 6.2 9 6.2 5.9 6.2 3.6 8.5 3.6 11.4s2.3 5.2 5.4 5.2c1.2 0 2.3-.4 3.3-1.3l-.8-1.1zm3.8-2.6h-1v-1.2h1V9.1h1.1v1.3h1.1V9.1h1.1v1.3h1v1.2h-1v1.5h1v1.2h-1v1.3h-1.1v-1.3h-1.1v1.3h-1.1v-1.3h-1v-1.2h1v-1.5zm1.1 1.5h1.1v-1.5h-1.1v1.5z"
          fill="#FFFFFF"
        />
      </svg>
    )
  }

  // 4. React / React Native
  if (norm === "react" || norm.includes("react native")) {
    return (
      <svg {...svgProps}>
        <ellipse cx="12" cy="12" rx="9" ry="3.8" stroke="#61DAFB" strokeWidth="1.5" />
        <ellipse cx="12" cy="12" rx="9" ry="3.8" stroke="#61DAFB" strokeWidth="1.5" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="9" ry="3.8" stroke="#61DAFB" strokeWidth="1.5" transform="rotate(120 12 12)" />
        <circle cx="12" cy="12" r="1.8" fill="#61DAFB" />
      </svg>
    )
  }

  // 5. Angular
  if (norm.includes("angular")) {
    return (
      <svg {...svgProps}>
        <path d="M12 2.5L3.5 5.5 4.8 17 12 21.5l7.2-4.5 1.3-11.5L12 2.5z" fill="#DD0031" />
        <path d="M12 2.5v19l7.2-4.5 1.3-11.5L12 2.5z" fill="#C3002F" />
        <path d="M12 5.5l-4.5 10h1.8l.9-2.3h3.6l.9 2.3h1.8L12 5.5zm1.2 6.2h-2.4l1.2-3 1.2 3z" fill="#FFFFFF" />
      </svg>
    )
  }

  // 6. Vue.js
  if (norm.includes("vue")) {
    return (
      <svg {...svgProps}>
        <polygon points="12,18.5 2,4 6,4 12,13 18,4 22,4" fill="#42B883" />
        <polygon points="12,18.5 6.5,4 9.5,4 12,8 14.5,4 17.5,4" fill="#35495E" />
      </svg>
    )
  }

  // 7. Next.js
  if (norm.includes("next")) {
    return (
      <svg {...svgProps}>
        <circle cx="12" cy="12" r="10" fill="#000000" />
        <path d="M7.8 7.5v9h1.9v-5.2l6.2 5.2h1.4v-9h-1.9v5.1L9.2 7.5H7.8z" fill="#FFFFFF" />
      </svg>
    )
  }

  // 8. TypeScript
  if (norm === "typescript" || norm === "ts") {
    return (
      <svg {...svgProps}>
        <rect width="24" height="24" rx="4" fill="#3178C6" />
        <path
          d="M4.5 9h5.5v1.8H8.3v6.7H6.2v-6.7H4.5V9zm10.7 2.2c-.4-.3-.9-.4-1.5-.4-.7 0-1.1.3-1.1.7 0 .5.4.7 1.4 1 1.6.4 2.5 1 2.5 2.2 0 1.6-1.3 2.5-3 2.5-1.1 0-2-.3-2.7-.9l.7-1.5c.6.5 1.3.8 2 .8.8 0 1.2-.3 1.2-.8 0-.4-.4-.7-1.4-1-1.5-.4-2.5-1-2.5-2.2 0-1.4 1.1-2.4 2.8-2.4 1 0 1.8.3 2.3.7l-.7 1.3z"
          fill="#FFFFFF"
        />
      </svg>
    )
  }

  // 9. JavaScript
  if (norm === "javascript" || norm === "js") {
    return (
      <svg {...svgProps}>
        <rect width="24" height="24" rx="4" fill="#F7DF1E" />
        <path
          d="M7 14.8c.4.6.9 1 1.6 1 .8 0 1.3-.4 1.3-1.2V9h2.2v5.7c0 2-1.2 3-3.1 3-1.4 0-2.4-.6-3-1.8l1-1.1zm8.3.1c.5.8 1.3 1.3 2.3 1.3 1 0 1.6-.5 1.6-1.1 0-.8-.6-1.1-1.8-1.5-1.7-.6-2.8-1.3-2.8-2.8 0-1.6 1.3-2.8 3.1-2.8 1.4 0 2.4.5 3.1 1.7l-1.6 1.1c-.4-.7-.8-1-1.5-1-.7 0-1.2.4-1.2.9 0 .6.5.9 1.6 1.3 1.9.7 3.1 1.4 3.1 3 0 1.8-1.4 2.9-3.4 2.9-1.9 0-3.1-.8-3.7-2.1l1.7-.9z"
          fill="#000000"
        />
      </svg>
    )
  }

  // 10. HTML
  if (norm === "html" || norm === "html5") {
    return (
      <svg {...svgProps}>
        <path d="M4 3l1.8 16.5L12 21.5l6.2-2L20 3H4z" fill="#E34F26" />
        <path d="M12 4.5v15.5l4.8-1.5L18.2 4.5H12z" fill="#EF652A" />
        <path d="M7.5 7h9l-.2 2.2h-6.6l.2 2.5h6.1l-.6 6-4 1.2-4-1.2-.3-3.2h2.2l.2 1.6 1.9.5 1.9-.5.2-2.3H7.5L7.5 7z" fill="#FFFFFF" />
      </svg>
    )
  }

  // 11. CSS
  if (norm === "css" || norm === "css3") {
    return (
      <svg {...svgProps}>
        <path d="M4 3l1.8 16.5L12 21.5l6.2-2L20 3H4z" fill="#1572B6" />
        <path d="M12 4.5v15.5l4.8-1.5L18.2 4.5H12z" fill="#33A9DC" />
        <path d="M7.5 7h9l-.2 2.2h-6.6l.2 2.5h6.1l-.6 6-4 1.2-4-1.2-.3-3.2h2.2l.2 1.6 1.9.5 1.9-.5.2-2.3H7.5L7.5 7z" fill="#FFFFFF" />
      </svg>
    )
  }

  // 12. Tailwind CSS
  if (norm.includes("tailwind")) {
    return (
      <svg {...svgProps}>
        <path
          d="M12 7c-2.4 0-3.8 1.2-4.4 3.6 1-.8 2.1-1.1 3.2-.8.6.2 1 .6 1.5 1.1 1.6 1.6 3.4 3.5 7.7 3.5 2.4 0 3.8-1.2 4.4-3.6-1 .8-2.1 1.1-3.2.8-.6-.2-1-.6-1.5-1.1-1.6-1.6-3.4-3.5-7.7-3.5zm-8 7c-2.4 0-3.8 1.2-4.4 3.6 1-.8 2.1-1.1 3.2-.8.6.2 1 .6 1.5 1.1 1.6 1.6 3.4 3.5 7.7 3.5 2.4 0 3.8-1.2 4.4-3.6-1 .8-2.1 1.1-3.2.8-.6-.2-1-.6-1.5-1.1-1.6-1.6-3.4-3.5-7.7-3.5z"
          fill="#06B6D4"
        />
      </svg>
    )
  }

  // 13. Node.js
  if (norm.includes("node")) {
    return (
      <svg {...svgProps}>
        <path
          d="M12 3l8 4.6v9.2l-8 4.6-8-4.6V7.6L12 3z"
          fill="#339933"
        />
        <path
          d="M12 6.5l5.5 3.2v6.4L12 19.3l-5.5-3.2V9.7L12 6.5z"
          fill="#FFFFFF"
        />
        <path
          d="M12 8.5l3.8 2.2v4.4L12 17.3l-3.8-2.2v-4.4L12 8.5z"
          fill="#339933"
        />
      </svg>
    )
  }

  // 14. Python
  if (norm.includes("python")) {
    return (
      <svg {...svgProps}>
        <path
          d="M11.9 2c-3.1 0-4.9.4-4.9 2.2v2.3h5V7H5.2C3.4 7 2 8.5 2 11.2c0 2.2 1.3 3.6 3.1 3.6h1.7V13c0-2 1.7-3.8 3.8-3.8h5V8.5c0-1.8-1.7-2.5-3.7-2.5V2zm-1.8 1.5c.5 0 .9.4.9.9 0 .5-.4.9-.9.9s-.9-.4-.9-.9c0-.5.4-.9.9-.9z"
          fill="#3776AB"
        />
        <path
          d="M12.1 22c3.1 0 4.9-.4 4.9-2.2v-2.3h-5V17h6.8c1.8 0 3.2-1.5 3.2-4.2 0-2.2-1.3-3.6-3.1-3.6h-1.7V11c0 2-1.7 3.8-3.8 3.8h-5v1.7c0 1.8 1.7 2.5 3.7 2.5V22zm1.8-1.5c-.5 0-.9-.4-.9-.9 0-.5.4-.9.9-.9s.9.4.9.9c0 .5-.4.9-.9.9z"
          fill="#FFD43B"
        />
      </svg>
    )
  }

  // 15. Java
  if (norm === "java") {
    return (
      <svg {...svgProps}>
        <path d="M8.5 18c2.2.3 4.8.3 7 0 .5-.1 1-.2 1.5-.4-.3.6-.9 1.1-1.7 1.4-2 .8-5.3.8-7.5 0-.7-.3-1.2-.7-1.4-1.3.7.2 1.4.3 2.1.3z" fill="#EA2D2E" />
        <path d="M7 15.5c2.6.4 5.7.4 8.2 0 .6-.1 1.2-.3 1.8-.5-.4.7-1.1 1.3-2 1.6-2.4.9-6.3.9-9 0-.8-.3-1.4-.8-1.7-1.5.8.2 1.8.3 2.7.4z" fill="#EA2D2E" />
        <path d="M12 2C10.5 4 10 5.5 11 7c1.2 1.8 2.5 2.5 1.5 4.5-1-2-.5-3.5.5-4.8C14 5.2 13.5 3.5 12 2z" fill="#EA2D2E" />
        <path d="M16 4c-.8 1.3-.8 2.4-.2 3.5.7 1.2 1.4 2 .8 3.5-.6-1.5-.2-2.5.4-3.5.7-1.2.4-2.3-1-3.5z" fill="#5382A1" />
        <path d="M6 12.5c3.5.5 7.5.5 11 0 1-.2 1.5-.5 2-.9-1.2 2-3.8 3.4-7.5 3.4s-6.3-1.4-7.5-3.4c.6.4 1.2.7 2 .9z" fill="#5382A1" />
      </svg>
    )
  }

  // 16. Spring Boot / Spring
  if (norm.includes("spring")) {
    return (
      <svg {...svgProps}>
        <rect width="24" height="24" rx="4" fill="#6DB33F" />
        <path
          d="M12 4.5C8 8.5 7 13.5 9 17.5c4-2 6-5 6.5-9 .2 2 1.5 3.5 3.5 4-1-4-3-6.5-7-8zm-2 9.5c-.8-1.5-.8-3.2 0-4.5 1.2 1.2 1.8 2.8 1.5 4.5h-1.5z"
          fill="#FFFFFF"
        />
      </svg>
    )
  }

  // 17. Go / Golang
  if (norm === "go" || norm === "golang") {
    return (
      <svg {...svgProps}>
        <path
          d="M3 13.5c0-2.5 1.8-4.5 4.5-4.5 1.8 0 3.2.9 3.8 2.2l-1.8 1c-.4-.7-1-1.1-2-1.1-1.4 0-2.3 1-2.3 2.4s.9 2.4 2.3 2.4c1.1 0 1.8-.5 2.1-1.3H7.5v-1.8h4.2v4.8c-.9.9-2.3 1.5-4.2 1.5-2.7 0-4.5-2-4.5-4.6zm13.5-4.5c2.7 0 4.5 2 4.5 4.6 0 2.5-1.8 4.5-4.5 4.5s-4.5-2-4.5-4.5c0-2.6 1.8-4.6 4.5-4.6zm0 2.1c-1.4 0-2.3 1-2.3 2.4s.9 2.4 2.3 2.4 2.3-1 2.3-2.4-.9-2.4-2.3-2.4z"
          fill="#00ADD8"
        />
      </svg>
    )
  }

  // 18. PHP
  if (norm === "php") {
    return (
      <svg {...svgProps}>
        <ellipse cx="12" cy="12" rx="10" ry="6.5" fill="#777BB4" />
        <path
          d="M7.8 9.5h2.2c1.1 0 1.8.5 1.8 1.5 0 1.1-.8 1.6-1.9 1.6H8.7l-.7 2.4H6.7l1.1-5.5zm1.4 2.1h.9c.5 0 .9-.2.9-.6 0-.4-.3-.6-.8-.6h-.8l-.3 1.2zm5.1-2.1h1.3l-.6 2.1h1.8l.6-2.1h1.3l-1.6 5.5h-1.3l.7-2.4h-1.8l-.7 2.4h-1.3l1.6-5.5zm-5.7 3.4"
          fill="#FFFFFF"
        />
      </svg>
    )
  }

  // 19. Laravel
  if (norm.includes("laravel")) {
    return (
      <svg {...svgProps}>
        <path
          d="M4.5 7.5L12 3l7.5 4.5v9L12 21l-7.5-4.5v-9zm7.5-2L6.5 8.7l5.5 3.3 5.5-3.3L12 5.5zm-6 4.7v6.6l5.5 3.3v-6.6L6 10.2zm12 0l-5.5 3.3v6.6l5.5-3.3v-6.6z"
          fill="#FF2D20"
        />
      </svg>
    )
  }

  // 20. Docker
  if (norm.includes("docker")) {
    return (
      <svg {...svgProps}>
        <rect x="5" y="10" width="2" height="2" rx="0.3" fill="#2496ED" />
        <rect x="8" y="10" width="2" height="2" rx="0.3" fill="#2496ED" />
        <rect x="11" y="10" width="2" height="2" rx="0.3" fill="#2496ED" />
        <rect x="8" y="7.5" width="2" height="2" rx="0.3" fill="#2496ED" />
        <rect x="11" y="7.5" width="2" height="2" rx="0.3" fill="#2496ED" />
        <rect x="14" y="10" width="2" height="2" rx="0.3" fill="#2496ED" />
        <path
          d="M21.5 12.5c-.5-.4-1.4-.4-2-.2-.2-.8-.7-1.4-1.5-1.7-.2 0-.4 0-.6.1-.2-1.3-1.1-2.2-2.4-2.2-.2 0-.4 0-.6.1V12H3c0 4.2 3.4 7.5 7.5 7.5 5.5 0 10-3.5 11-7z"
          fill="#2496ED"
        />
      </svg>
    )
  }

  // 21. Git
  if (norm === "git") {
    return (
      <svg {...svgProps}>
        <path
          d="M21.6 10.8l-8.4-8.4c-.6-.6-1.6-.6-2.2 0L8.7 4.7l2.8 2.8c.6-.2 1.4 0 1.9.5.5.5.7 1.3.5 1.9l2.7 2.7c.6-.2 1.4 0 1.9.5.8.8.8 2 0 2.8-.8.8-2 .8-2.8 0-.6-.6-.7-1.4-.4-2.1l-2.5-2.5v4.2c.2.2.4.5.4.9 0 .8-.7 1.5-1.5 1.5s-1.5-.7-1.5-1.5c0-.6.3-1.1.8-1.3V9.7c-.5-.2-.8-.7-.8-1.3 0-.4.2-.8.5-1.1L8.2 4.8 2.4 10.6c-.6.6-.6 1.6 0 2.2l8.4 8.4c.6.6 1.6.6 2.2 0l8.6-8.6c.6-.4.6-1.4 0-1.8z"
          fill="#F05032"
        />
      </svg>
    )
  }

  // 22. GitHub Actions / GitHub
  if (norm.includes("github")) {
    return (
      <svg {...svgProps}>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          fill="#24292F"
        />
      </svg>
    )
  }

  // 23. Flutter
  if (norm.includes("flutter")) {
    return (
      <svg {...svgProps}>
        <path d="M13.5 2.5L4 12l2.8 2.8L19.2 2.5h-5.7zm0 9.8l-5.6 5.6 2.8 2.8 5.6-5.6-2.8-2.8zm2.8 8.4h5.7l-5.7-5.7-2.8 2.8 2.8 2.9z" fill="#02569B" />
        <path d="M19.2 2.5h-5.7L8.5 7.5l2.8 2.8 7.9-7.8z" fill="#0175C2" />
        <path d="M13.5 12.3l2.8-2.8 5.7 5.7h-5.7l-2.8-2.9z" fill="#29B6F6" />
      </svg>
    )
  }

  // 24. Dart
  if (norm === "dart") {
    return (
      <svg {...svgProps}>
        <path d="M4 13.5l4-9.5h8l4 4-8 12.5-8-7z" fill="#0175C2" />
        <path d="M8 4l8 8-4 8.5L4 13.5 8 4z" fill="#00B4AB" />
      </svg>
    )
  }

  // 25. Kotlin
  if (norm.includes("kotlin")) {
    return (
      <svg {...svgProps}>
        <polygon points="21,3 3,3 3,21 21,3" fill="#7F52FF" />
        <polygon points="12,12 3,21 21,21 12,12" fill="#E4485D" />
        <polygon points="3,3 12,12 3,21 3,3" fill="#C711E1" />
      </svg>
    )
  }

  // 26. Swift
  if (norm.includes("swift")) {
    return (
      <svg {...svgProps}>
        <path
          d="M19.8 15.6c-.4.5-2.2 2.4-5.3 3-3.4.6-6.4-.8-8.2-2.6 3 1.3 6.3.7 8.3-.7-2-.1-3.7-1.1-4.7-2.6 1.7.3 3.3-.2 4.4-1-2.4-.7-4.1-2.8-4.1-5.3 1.1.6 2.4.9 3.8.9-2.6-2.2-3.3-5.7-1.6-8.3 2.8 3.5 7 5.7 11.6 6-.3-1.6.2-3.2 1.3-4.3 1.7-1.7 4.5-1.6 6.1.2 1-.2 2-.6 2.8-1.1-.3 1.1-1.1 2-2.1 2.6.9-.1 1.8-.4 2.6-.7-.6 1-1.4 1.8-2.4 2.5.1 1.6-.3 3.3-1.1 4.9z"
          fill="#F05138"
        />
      </svg>
    )
  }

  // 27. AWS
  if (norm === "aws" || norm.includes("amazon")) {
    return (
      <svg {...svgProps}>
        <path
          d="M7.4 11.8c0-.9.6-1.5 1.5-1.5.8 0 1.4.6 1.4 1.5v2.8H9V12c0-.5-.3-.8-.8-.8-.5 0-.8.3-.8.8v2.6H6v-5.2h1.4v2.4zm5.5 2.8l1.4-5.2h1.5l1.4 5.2h-1.4l-.3-1.3h-1l-.3 1.3h-1.3zm1.8-2.4h.6l-.3-1.4-.3 1.4zm-8.2 4.6c4.6 2.6 10.3 2.1 14.5-.6l-.8-.8c-3.7 2.4-8.8 2.8-12.8.5l-.9.9zm13.7.1l1.6-.2-.7-1.5-.9 1.7z"
          fill="#FF9900"
        />
      </svg>
    )
  }

  // 28. Azure
  if (norm.includes("azure")) {
    return (
      <svg {...svgProps}>
        <path d="M13.2 3.5L5.5 15.8h5.2L6 20.5h12.5L13.2 3.5z" fill="#0078D4" />
        <path d="M10.7 15.8l2.5-4.5 4.8 9.2H6l4.7-4.7z" fill="#0089D6" />
      </svg>
    )
  }

  // 29. Kubernetes
  if (norm.includes("kubernetes") || norm === "k8s") {
    return (
      <svg {...svgProps}>
        <circle cx="12" cy="12" r="9" stroke="#326CE5" strokeWidth="2" />
        <path
          d="M12 3v18M3 12h18M6 6l12 12M6 18L18 6"
          stroke="#326CE5"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="3.5" fill="#326CE5" />
      </svg>
    )
  }

  // 30. Terraform
  if (norm.includes("terraform")) {
    return (
      <svg {...svgProps}>
        <polygon points="3,3 9.5,6.8 9.5,14 3,10.2" fill="#5C4EE5" />
        <polygon points="10.5,7.3 17,11 17,18.2 10.5,14.5" fill="#4040B2" />
        <polygon points="10.5,6.8 17,3 17,10.2 10.5,14" fill="#844FBA" />
        <polygon points="3,11 9.5,14.8 9.5,22 3,18.2" fill="#5C4EE5" />
      </svg>
    )
  }

  // 31. Linux
  if (norm.includes("linux")) {
    return (
      <svg {...svgProps}>
        <ellipse cx="12" cy="13" rx="6.5" ry="8" fill="#000000" />
        <ellipse cx="12" cy="14" rx="4.5" ry="5.5" fill="#FFFFFF" />
        <circle cx="10" cy="8.5" r="1.2" fill="#FFFFFF" />
        <circle cx="10.2" cy="8.5" r="0.6" fill="#000000" />
        <circle cx="14" cy="8.5" r="1.2" fill="#FFFFFF" />
        <circle cx="13.8" cy="8.5" r="0.6" fill="#000000" />
        <polygon points="12,10 10.5,12 13.5,12" fill="#FFA500" />
        <ellipse cx="8" cy="20.5" rx="2.5" ry="1.2" fill="#FFA500" />
        <ellipse cx="16" cy="20.5" rx="2.5" ry="1.2" fill="#FFA500" />
      </svg>
    )
  }

  // 32. CI/CD
  if (norm.includes("ci/cd") || norm === "cicd") {
    return (
      <svg {...svgProps}>
        <path
          d="M8 8a4 4 0 100 8c2.5 0 3.5-3 5.5-5s3-3 5.5-3a4 4 0 110 8c-2.5 0-3.5-3-5.5-5s-3-3-5.5-3z"
          stroke="#0284C7"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="6" cy="12" r="1.5" fill="#0284C7" />
        <circle cx="18" cy="12" r="1.5" fill="#0284C7" />
      </svg>
    )
  }

  // 33. PyTorch
  if (norm.includes("pytorch")) {
    return (
      <svg {...svgProps}>
        <path
          d="M13.5 3.5L12 5l2 2-3 3c-2.2 2.2-2.2 5.8 0 8s5.8 2.2 8 0c2.2-2.2 2.2-5.8 0-8l-5.5-6.5z"
          fill="#EE4C2C"
        />
        <circle cx="17.5" cy="6.5" r="1.5" fill="#EE4C2C" />
      </svg>
    )
  }

  // 34. TensorFlow
  if (norm.includes("tensorflow")) {
    return (
      <svg {...svgProps}>
        <path d="M12 2.5l7 4v5l-4-2.3v7.6l-3 1.7v-16z" fill="#FF6F00" />
        <path d="M12 2.5l-7 4v5l4-2.3v7.6l3 1.7v-16z" fill="#E53935" />
      </svg>
    )
  }

  // 35. RAG / LangChain / Machine Learning / AI
  if (
    norm.includes("rag") ||
    norm.includes("langchain") ||
    norm.includes("machine learning") ||
    norm.includes("ai")
  ) {
    return (
      <svg {...svgProps}>
        <path
          d="M12 3v3m0 12v3M3 12h3m12 0h3M6.3 6.3l2.1 2.1m7.2 7.2l2.1 2.1M6.3 17.7l2.1-2.1m7.2-7.2l2.1-2.1"
          stroke="#8B5CF6"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="4.2" stroke="#8B5CF6" strokeWidth="2" fill="#F5F3FF" />
        <circle cx="12" cy="12" r="2" fill="#8B5CF6" />
      </svg>
    )
  }

  // 36. PostgreSQL
  if (norm.includes("postgres")) {
    return (
      <svg {...svgProps}>
        <path
          d="M17.5 7.5C16 5 13.5 4 11 4 7 4 4 7 4 11.5c0 3.2 1.8 6 4.5 7.2l.5 3.3h3l-.2-2.2c.4 0 .8.1 1.2.1 3 0 5-1.5 6-3.8.8-1.9.8-6.1-1.5-8.6zm-6 8.5c-2.5 0-4-1.8-4-4.5s1.5-4.5 4-4.5 4 1.8 4 4.5-1.5 4.5-4 4.5z"
          fill="#336791"
        />
      </svg>
    )
  }

  // 37. MySQL
  if (norm.includes("mysql")) {
    return (
      <svg {...svgProps}>
        <path
          d="M19 12c-1.5-2.5-4-4.2-7-4.2-4.5 0-8 3.5-8 8s3.5 8 8 8c2.8 0 5.2-1.4 6.6-3.5l-2.2-1.3c-1 1.5-2.6 2.5-4.4 2.5-3 0-5.5-2.5-5.5-5.5s2.5-5.5 5.5-5.5c2 0 3.8 1.1 4.7 2.8L19 12z"
          fill="#00758F"
        />
        <circle cx="15.5" cy="7" r="1.5" fill="#F29111" />
      </svg>
    )
  }

  // 38. MongoDB
  if (norm.includes("mongo")) {
    return (
      <svg {...svgProps}>
        <path
          d="M12 2.5C12 2.5 6 8.5 6 13.5c0 3.5 2.7 6.5 6 7.5 3.3-1 6-4 6-7.5 0-5-6-11-6-11z"
          fill="#47A248"
        />
        <path
          d="M12 2.5v18.5c3.3-1 6-4 6-7.5 0-5-6-11-6-11z"
          fill="#499D4A"
        />
        <path
          d="M12 18.5c-.2 0-.4-.1-.5-.3l-1-2.5c-.2-.5.1-1.1.6-1.3.5-.2 1.1.1 1.3.6l.6 1.7.6-1.7c.2-.5.8-.8 1.3-.6.5.2.8.8.6 1.3l-1 2.5c-.2.2-.4.3-.5.3z"
          fill="#FFFFFF"
        />
      </svg>
    )
  }

  // 39. Redis
  if (norm.includes("redis")) {
    return (
      <svg {...svgProps}>
        <path d="M12 3l9 4.5-9 4.5-9-4.5L12 3z" fill="#DC382D" />
        <path d="M3 11.5l9 4.5 9-4.5v3l-9 4.5-9-4.5v-3z" fill="#B3261E" />
        <path d="M3 15.5l9 4.5 9-4.5v3l-9 4.5-9-4.5v-3z" fill="#8C1D18" />
      </svg>
    )
  }

  // 40. SQL Server
  if (norm.includes("sql server") || norm === "mssql" || norm === "sqlserver") {
    return (
      <svg {...svgProps}>
        <rect width="24" height="24" rx="4" fill="#CC292B" />
        <ellipse cx="12" cy="7.5" rx="6" ry="2.2" fill="#FFFFFF" />
        <path d="M6 7.5v4c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2v-4" stroke="#FFFFFF" strokeWidth="1.6" fill="none" />
        <path d="M6 11.5v4c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2v-4" stroke="#FFFFFF" strokeWidth="1.6" fill="none" />
      </svg>
    )
  }

  // 41. DynamoDB
  if (norm.includes("dynamodb")) {
    return (
      <svg {...svgProps}>
        <rect width="24" height="24" rx="4" fill="#4053EC" />
        <ellipse cx="12" cy="7" rx="5.5" ry="2" fill="#FFFFFF" opacity="0.9" />
        <path d="M6.5 7v4.5c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2V7" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
        <path d="M6.5 11.5V16c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-4.5" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
        <path d="M12 9l-2 3.5h3L11.5 16l3.5-4h-2.5L14 9h-2z" fill="#FFD43B" />
      </svg>
    )
  }

  // 42. Figma
  if (norm.includes("figma")) {
    return (
      <svg {...svgProps}>
        <path d="M8.5 3h3.5v5.5H8.5a2.75 2.75 0 010-5.5z" fill="#F24E1E" />
        <path d="M12 3h3.5a2.75 2.75 0 010 5.5H12V3z" fill="#FF7262" />
        <path d="M8.5 8.5h3.5V14H8.5a2.75 2.75 0 010-5.5z" fill="#A259FF" />
        <circle cx="14.75" cy="11.25" r="2.75" fill="#1ABCFE" />
        <path d="M8.5 14h3.5v3.5a2.75 2.75 0 01-3.5-2.75V14z" fill="#0ACF83" />
      </svg>
    )
  }

  // 43. Wireframing
  if (norm.includes("wirefram")) {
    return (
      <svg {...svgProps}>
        <rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke="#64748B" strokeWidth="1.8" />
        <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" stroke="#64748B" strokeWidth="1.4" />
        <line x1="9.5" y1="9.5" x2="9.5" y2="19.5" stroke="#64748B" strokeWidth="1.4" />
        <rect x="12" y="12" width="6" height="5" rx="1" fill="#94A3B8" />
      </svg>
    )
  }

  // 44. Prototyping
  if (norm.includes("prototyp")) {
    return (
      <svg {...svgProps}>
        <rect x="6.5" y="3.5" width="11" height="17" rx="2.5" stroke="#8B5CF6" strokeWidth="1.8" />
        <line x1="10" y1="6" x2="14" y2="6" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="17.5" r="1.2" fill="#8B5CF6" />
        <path d="M13 10l3 3-1.5 1-1.5-1v3h-1.5V10h1.5z" fill="#8B5CF6" />
      </svg>
    )
  }

  // 45. REST API / API
  if (norm.includes("api") || norm.includes("rest")) {
    return (
      <svg {...svgProps}>
        <rect x="3" y="6" width="18" height="12" rx="3" stroke="#0284C7" strokeWidth="1.8" />
        <path d="M7 13.5l2-3 2 3M8 12.5h2M14 10.5v3M17 10.5h2c.8 0 1.2.4 1.2 1s-.4 1-1.2 1h-2" stroke="#0284C7" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    )
  }

  // 46. GraphQL
  if (norm.includes("graphql")) {
    return (
      <svg {...svgProps}>
        <polygon points="12,3 20,7.6 20,16.4 12,21 4,16.4 4,7.6" stroke="#E10098" strokeWidth="1.6" fill="none" />
        <circle cx="12" cy="3" r="1.8" fill="#E10098" />
        <circle cx="20" cy="7.6" r="1.8" fill="#E10098" />
        <circle cx="20" cy="16.4" r="1.8" fill="#E10098" />
        <circle cx="12" cy="21" r="1.8" fill="#E10098" />
        <circle cx="4" cy="16.4" r="1.8" fill="#E10098" />
        <circle cx="4" cy="7.6" r="1.8" fill="#E10098" />
        <line x1="4" y1="7.6" x2="20" y2="16.4" stroke="#E10098" strokeWidth="1.2" />
        <line x1="20" y1="7.6" x2="4" y2="16.4" stroke="#E10098" strokeWidth="1.2" />
        <line x1="12" y1="3" x2="12" y2="21" stroke="#E10098" strokeWidth="1.2" />
      </svg>
    )
  }

  // 47. JWT
  if (norm.includes("jwt")) {
    return (
      <svg {...svgProps}>
        <circle cx="12" cy="12" r="8.5" stroke="#D63AFF" strokeWidth="2" strokeDasharray="5 3" />
        <circle cx="12" cy="12" r="3.5" fill="#00B9F1" />
      </svg>
    )
  }

  // 48. FastAPI
  if (norm.includes("fastapi")) {
    return (
      <svg {...svgProps}>
        <circle cx="12" cy="12" r="10" fill="#059669" />
        <path d="M13 5L7 13h5l-1 6 6-8h-5l1-6z" fill="#FFFFFF" />
      </svg>
    )
  }

  // 49. OpenAI / LLM
  if (norm.includes("openai") || norm.includes("chatgpt") || norm.includes("llm")) {
    return (
      <svg {...svgProps}>
        <circle cx="12" cy="12" r="10" fill="#10A37F" />
        <path
          d="M12 7a5 5 0 014.33 2.5l-1.3.75A3.5 3.5 0 0012 8.5v-1.5zm3.75 3.25A5 5 0 0117 12h-1.5a3.5 3.5 0 00-.5-1.75l1.25-.75zm.75 4.75A5 5 0 0112 17v-1.5a3.5 3.5 0 002.25-1.25l1.25.75zM12 17a5 5 0 01-4.33-2.5l1.3-.75A3.5 3.5 0 0012 15.5v1.5zm-3.75-3.25A5 5 0 017 12h1.5a3.5 3.5 0 00.5 1.75l-1.25.75zM7.5 9a5 5 0 014.5-2v1.5a3.5 3.5 0 00-2.25 1.25L7.5 9z"
          fill="#FFFFFF"
        />
        <circle cx="12" cy="12" r="2" fill="#FFFFFF" />
      </svg>
    )
  }

  // 50. Supabase
  if (norm.includes("supabase")) {
    return (
      <svg {...svgProps}>
        <rect width="24" height="24" rx="4" fill="#1E293B" />
        <path
          d="M13.2 4.5L5.5 14.2a.5.5 0 00.4.8h5.3v4.5l7.7-9.7a.5.5 0 00-.4-.8h-5.3V4.5z"
          fill="#3ECF8E"
        />
      </svg>
    )
  }

  // 51. Solidity / Web3
  if (norm.includes("solidity") || norm.includes("web3") || norm.includes("ethereum")) {
    return (
      <svg {...svgProps}>
        <polygon points="12,3 5.5,12 12,15.5 18.5,12" fill="#627EEA" />
        <polygon points="12,16.5 5.5,13 12,21 18.5,13" fill="#4559A4" />
      </svg>
    )
  }

  // 52. C++ / C
  if (norm === "c++" || norm === "cpp" || norm === "c") {
    return (
      <svg {...svgProps}>
        <rect width="24" height="24" rx="4" fill="#00599C" />
        <path
          d="M10 8.5a3.5 3.5 0 00-3.5 3.5 3.5 3.5 0 003.5 3.5c1.2 0 2.2-.6 2.8-1.5l-1.2-.8c-.4.5-1 .8-1.6.8-1.4 0-2.3-1-2.3-2s.9-2 2.3-2c.6 0 1.2.3 1.6.8l1.2-.8c-.6-.9-1.6-1.5-2.8-1.5zm4 3h1v-1h1v1h1v1h-1v1h-1v-1h-1v-1zm4.5 0h1v-1h1v1h1v1h-1v1h-1v-1h-1v-1z"
          fill="#FFFFFF"
        />
      </svg>
    )
  }

  // 53. Bootstrap
  if (norm.includes("bootstrap")) {
    return (
      <svg {...svgProps}>
        <rect width="24" height="24" rx="5" fill="#7952B3" />
        <path
          d="M8.5 7.5h4.2c1.4 0 2.3.7 2.3 1.8 0 .8-.5 1.4-1.3 1.6 1 .2 1.7.9 1.7 1.9 0 1.3-1.1 2.2-2.7 2.2H8.5V7.5zm2.2 3.1h1.7c.6 0 1-.3 1-.8s-.4-.8-1-.8h-1.7v1.6zm0 2.9h2c.7 0 1.1-.3 1.1-.9s-.4-.9-1.1-.9h-2v1.8z"
          fill="#FFFFFF"
        />
      </svg>
    )
  }

  // 54. Excel / Spreadsheet
  if (norm.includes("excel") || norm.includes("spreadsheet")) {
    return (
      <svg {...svgProps}>
        <rect width="24" height="24" rx="4" fill="#107C41" />
        <path
          d="M8 8l3 4-3 4h2l2-2.8 2 2.8h2l-3-4 3-4h-2l-2 2.8L10 8H8z"
          fill="#FFFFFF"
        />
      </svg>
    )
  }

  // 55. Power BI
  if (norm.includes("power bi") || norm.includes("powerbi")) {
    return (
      <svg {...svgProps}>
        <rect width="24" height="24" rx="4" fill="#292929" />
        <rect x="6" y="13" width="3" height="7" rx="1" fill="#F2C811" />
        <rect x="10.5" y="9" width="3" height="11" rx="1" fill="#F2C811" />
        <rect x="15" y="5" width="3" height="15" rx="1" fill="#F2C811" />
      </svg>
    )
  }

  // 56. Google Cloud / GCP
  if (norm.includes("gcp") || norm.includes("google cloud")) {
    return (
      <svg {...svgProps}>
        <path
          d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"
          fill="#4285F4"
        />
      </svg>
    )
  }

  // 57. Firebase
  if (norm.includes("firebase")) {
    return (
      <svg {...svgProps}>
        <path d="M4.5 17.5L7 3.5l4 7.5-6.5 6.5z" fill="#FFA000" />
        <path d="M4.5 17.5l8 4.5 7-12-15 7.5z" fill="#F57C00" />
        <path d="M12.5 22l7-4.5L16.5 6 12.5 22z" fill="#FFCA28" />
      </svg>
    )
  }

  // Generic keyword fallbacks:
  // Database fallback
  if (norm.includes("database") || norm.includes("db") || norm.includes("sql")) {
    return (
      <svg {...svgProps}>
        <ellipse cx="12" cy="6" rx="7" ry="2.5" stroke="#0284C7" strokeWidth="1.8" />
        <path d="M5 6v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6" stroke="#0284C7" strokeWidth="1.8" fill="none" />
        <path d="M5 12v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" stroke="#0284C7" strokeWidth="1.8" fill="none" />
      </svg>
    )
  }

  // Cloud fallback
  if (norm.includes("cloud")) {
    return (
      <svg {...svgProps}>
        <path
          d="M6.5 18a4.5 4.5 0 01-.4-8.98A6.5 6.5 0 0118.2 11 4 4 0 0117.5 18h-11z"
          stroke="#0284C7"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  // Code / Default fallback
  return (
    <svg {...svgProps}>
      <path
        d="M8 8l-4 4 4 4m8-8l4 4-4 4m-4-10l-4 12"
        stroke="#64748B"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default SkillIcon
