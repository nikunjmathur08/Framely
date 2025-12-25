import { useEffect, useRef } from 'react';

export interface SeoOptions {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'video.movie' | 'video.tv_show' | 'article';
  url?: string;
  keywords?: string[];
  canonicalUrl?: string;
  jsonLd?: object | object[];
}

const DEFAULT_TITLE = 'Framely - Stream Movies & TV Shows Online | Watch Free';
const DEFAULT_DESCRIPTION = 'Watch unlimited movies and TV shows on Framely. Stream the latest releases, trending content, and classic favorites. Free streaming with no ads, high-quality video.';
const DEFAULT_IMAGE = 'https://framely-nm.vercel.app/framely_logo.png';
const BASE_URL = 'https://framely-nm.vercel.app';

/**
 * Hook to dynamically update document meta tags for SEO.
 * Updates title, description, Open Graph, Twitter Cards, and JSON-LD structured data.
 * 
 * @param options - SEO configuration options
 */
export function useSeo(options: SeoOptions = {}) {
  const jsonLdScriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    const {
      title,
      description,
      image,
      type = 'website',
      url,
      keywords,
      canonicalUrl,
      jsonLd,
    } = options;

    // Update document title
    const fullTitle = title ? `${title} | Framely` : DEFAULT_TITLE;
    document.title = fullTitle;

    // Helper to update or create meta tags
    const setMetaTag = (attribute: string, value: string, content: string) => {
      let element = document.querySelector(`meta[${attribute}="${value}"]`) as HTMLMetaElement;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, value);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Primary meta tags
    setMetaTag('name', 'title', fullTitle);
    setMetaTag('name', 'description', description || DEFAULT_DESCRIPTION);
    
    if (keywords && keywords.length > 0) {
      setMetaTag('name', 'keywords', keywords.join(', '));
    }

    // Open Graph / Facebook
    setMetaTag('property', 'og:type', type);
    setMetaTag('property', 'og:url', url || `${BASE_URL}${window.location.pathname}`);
    setMetaTag('property', 'og:title', title || DEFAULT_TITLE.split(' | ')[0]);
    setMetaTag('property', 'og:description', description || DEFAULT_DESCRIPTION);
    setMetaTag('property', 'og:image', image || DEFAULT_IMAGE);

    // Twitter Card
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:url', url || `${BASE_URL}${window.location.pathname}`);
    setMetaTag('name', 'twitter:title', title || DEFAULT_TITLE.split(' | ')[0]);
    setMetaTag('name', 'twitter:description', description || DEFAULT_DESCRIPTION);
    setMetaTag('name', 'twitter:image', image || DEFAULT_IMAGE);

    // Canonical URL
    let canonicalElement = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalElement) {
      canonicalElement = document.createElement('link');
      canonicalElement.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalElement);
    }
    canonicalElement.setAttribute('href', canonicalUrl || url || `${BASE_URL}${window.location.pathname}`);

    // JSON-LD Structured Data
    if (jsonLd) {
      // Remove previous script if exists
      if (jsonLdScriptRef.current) {
        jsonLdScriptRef.current.remove();
      }

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      
      if (Array.isArray(jsonLd)) {
        script.textContent = JSON.stringify(jsonLd);
      } else {
        script.textContent = JSON.stringify(jsonLd);
      }
      
      document.head.appendChild(script);
      jsonLdScriptRef.current = script;
    }

    // Cleanup on unmount
    return () => {
      if (jsonLdScriptRef.current) {
        jsonLdScriptRef.current.remove();
        jsonLdScriptRef.current = null;
      }
    };
  }, [options.title, options.description, options.image, options.type, options.url, options.keywords?.join(','), options.canonicalUrl, options.jsonLd]);
}

export default useSeo;
