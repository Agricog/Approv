/**
 * Footer Component
 * Site footer with links and branding
 */

import { Link } from 'react-router-dom'
import { CheckCircle, ExternalLink } from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

export interface FooterProps {
  variant?: 'default' | 'minimal'
  companyName?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

export function Footer({
  variant = 'default',
  companyName = 'Approv'
}: FooterProps) {
  const currentYear = new Date().getFullYear()

  if (variant === 'minimal') {
    return (
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-sm text-gray-500 text-center">
            © {currentYear} {companyName}. All rights reserved.
          </p>
        </div>
      </footer>
    )
  }

  const footerLinks = {
    product: [
      { name: 'Features', href: '/features' },
      { name: 'Pricing', href: '/pricing' },
      { name: 'Integrations', href: '/integrations' },
      { name: 'Changelog', href: '/changelog' }
    ],
    company: [
      { name: 'About', href: '/about' },
      { name: 'Blog', href: '/blog' },
      { name: 'Careers', href: '/careers' },
      { name: 'Contact', href: '/contact' }
    ],
    legal: [
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Cookie Policy', href: '/cookies' }
    ],
    support: [
      { name: 'Help Centre', href: '/help' },
      { name: 'Documentation', href: '/docs', external: true },
      { name: 'API Reference', href: '/api', external: true },
      { name: 'Status', href: 'https://status.approv.co.uk', external: true }
    ]
  }

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-white">
                {companyName}
              </span>
            </Link>
            <p className="text-sm text-gray-400">
              Professional client approval workflows for architecture and design practices.
            </p>
          </div>

          {/* Product links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Product</h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link 
                    to={link.href}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link 
                    to={link.href}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Support</h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  {link.external ? (
                    <a 
                      href={link.href}
                      className="text-sm hover:text-white transition-colors inline-flex items-center gap-1"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.name}
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    <Link 
                      to={link.href}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link 
                    to={link.href}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            © {currentYear} {companyName}. All rights reserved.
          </p>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              Made in the UK 🇬🇧
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

// =============================================================================
// SIMPLE FOOTER
// =============================================================================

export interface SimpleFooterProps {
  className?: string
}

export function SimpleFooter({ className = '' }: SimpleFooterProps) {
  return (
    <footer className={`py-6 text-center ${className}`}>
      <p className="text-sm text-gray-500">
        Powered by{' '}
        <a 
          href="https://approv.co.uk"
          className="text-green-600 hover:text-green-700 font-medium"
          target="_blank"
          rel="noopener noreferrer"
        >
          Approv
        </a>
      </p>
    </footer>
  )
}

export default Footer
