// Re-export from the JSX module to avoid JSX in .js files during build
// Legacy stub: this file used to export a custom i18n provider.
// It now re-exports react-i18next helpers to avoid breaking imports.
export { useTranslation, Trans } from 'react-i18next';
