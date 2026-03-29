// Allow CSS side-effect imports (e.g. in app/layout.tsx)
declare module '*.css' {
  const styles: Record<string, string>
  export default styles
}
