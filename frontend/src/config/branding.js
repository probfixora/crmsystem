export const BRANDING = {
  name: process.env.REACT_APP_COMPANY_NAME || 'Probfixora',
  shortName: process.env.REACT_APP_COMPANY_SHORT_NAME || 'PFX',
  email: process.env.REACT_APP_COMPANY_EMAIL || 'info@probfixora.com',
  supportEmail: process.env.REACT_APP_SUPPORT_EMAIL || 'support@probfixora.com',
  website: process.env.REACT_APP_COMPANY_WEBSITE || 'www.probfixora.com',
  phone: process.env.REACT_APP_COMPANY_PHONE || '+91 99999 99999',
  address: process.env.REACT_APP_COMPANY_ADDRESS || 'Probfixora, New Delhi, India',
  caseIdPrefix: process.env.REACT_APP_CASE_ID_PREFIX || 'PFX',
  year: process.env.REACT_APP_COPYRIGHT_YEAR || new Date().getFullYear().toString(),
};
