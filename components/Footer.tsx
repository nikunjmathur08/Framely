import React from 'react';
import { Github, Linkedin, ExternalLink } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#141414] border-t border-neutral-600 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-3">Framely</h3>
            <p className="text-gray-400 text-sm">
              Stream unlimited movies and TV shows. Watch the latest releases, trending content, and classic favorites.
            </p>
          </div>

          {/* Quick Links */}
          <div className='flex flex-col items-center'>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-gray-400 hover:text-white text-sm transition">
                  Home
                </a>
              </li>
              <li>
                <a href="/tv-shows" className="text-gray-400 hover:text-white text-sm transition">
                  TV Shows
                </a>
              </li>
              <li>
                <a href="/movies" className="text-gray-400 hover:text-white text-sm transition">
                  Movies
                </a>
              </li>
              <li>
                <a href="/my-list" className="text-gray-400 hover:text-white text-sm transition">
                  My List
                </a>
              </li>
            </ul>
          </div>

          {/* Made By */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-1">Made By</h3>
            <a 
              href="https://nikunjmathur.vercel.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 text-gray-400 hover:text-white transition mb-2"
            >
              <span className="text-sm font-medium">Nikunj Mathur</span>
            </a>
            
            <div className="flex items-center gap-3 mt-1">
              <a 
                href="https://github.com/nikunjmathur08" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a 
                href="https://www.linkedin.com/in/nikunjmathur08/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-neutral-600 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Framely. All rights reserved.
          </p>
          <div className="flex items-center gap-1">
            <p className="text-gray-500 text-sm">
              Built with ❤️ by{' '}
              <a 
                href="https://nikunjmathur.vercel.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-red-600 hover:text-red-500 transition"
              >
                Nikunj Mathur
              </a>
            </p>
            <p className="text-gray-500 text-sm">
              and TMDB
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
