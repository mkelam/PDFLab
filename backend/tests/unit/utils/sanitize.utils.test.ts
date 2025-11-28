/**
 * Comprehensive Unit Tests for Sanitize Utilities
 * Tests XSS prevention and HTML sanitization functions
 */

import { sanitizeText, sanitizeRichText, sanitizeArray, sanitizeObject } from '../../../src/utils/sanitize.utils'

describe('Sanitize Utilities', () => {
  // =========================================================================
  // sanitizeText TESTS
  // =========================================================================
  describe('sanitizeText', () => {
    describe('Empty/Null Input Handling', () => {
      it('should return empty string for null input', () => {
        expect(sanitizeText(null)).toBe('')
      })

      it('should return empty string for undefined input', () => {
        expect(sanitizeText(undefined)).toBe('')
      })

      it('should return empty string for empty string input', () => {
        expect(sanitizeText('')).toBe('')
      })

      it('should return trimmed empty string for whitespace-only input', () => {
        expect(sanitizeText('   ')).toBe('')
      })
    })

    describe('Plain Text Processing', () => {
      it('should return plain text unchanged', () => {
        expect(sanitizeText('Hello World')).toBe('Hello World')
      })

      it('should trim leading and trailing whitespace', () => {
        expect(sanitizeText('  Hello World  ')).toBe('Hello World')
      })

      it('should preserve internal whitespace', () => {
        expect(sanitizeText('Hello    World')).toBe('Hello    World')
      })

      it('should preserve special characters (ampersand gets HTML encoded)', () => {
        // Note: sanitize-html encodes & to &amp; for HTML safety
        expect(sanitizeText('Hello! @#$%^&*() World')).toBe('Hello! @#$%^&amp;*() World')
      })

      it('should preserve unicode characters', () => {
        expect(sanitizeText('Hello 世界 Мир 🌍')).toBe('Hello 世界 Мир 🌍')
      })

      it('should preserve newlines in plain text', () => {
        expect(sanitizeText('Line 1\nLine 2')).toBe('Line 1\nLine 2')
      })
    })

    describe('XSS Prevention - Script Tags', () => {
      it('should remove script tags', () => {
        expect(sanitizeText('<script>alert("XSS")</script>')).toBe('')
      })

      it('should remove script tags with content', () => {
        expect(sanitizeText('Hello <script>alert("XSS")</script> World')).toBe('Hello  World')
      })

      it('should remove obfuscated script tags', () => {
        expect(sanitizeText('<ScRiPt>alert("XSS")</ScRiPt>')).toBe('')
      })

      it('should remove script tags with attributes', () => {
        expect(sanitizeText('<script src="evil.js"></script>')).toBe('')
      })

      it('should handle nested script tags', () => {
        expect(sanitizeText('<script><script>alert("XSS")</script></script>')).toBe('')
      })
    })

    describe('XSS Prevention - Event Handlers', () => {
      it('should remove onclick handlers', () => {
        expect(sanitizeText('<div onclick="alert(1)">Click me</div>')).toBe('Click me')
      })

      it('should remove onmouseover handlers', () => {
        expect(sanitizeText('<img onmouseover="alert(1)" src="x">')).toBe('')
      })

      it('should remove onerror handlers', () => {
        expect(sanitizeText('<img onerror="alert(1)" src="invalid">')).toBe('')
      })

      it('should remove onload handlers', () => {
        expect(sanitizeText('<body onload="alert(1)">')).toBe('')
      })
    })

    describe('XSS Prevention - Dangerous Tags', () => {
      it('should remove iframe tags', () => {
        expect(sanitizeText('<iframe src="evil.com"></iframe>')).toBe('')
      })

      it('should remove object tags', () => {
        expect(sanitizeText('<object data="evil.swf"></object>')).toBe('')
      })

      it('should remove embed tags', () => {
        expect(sanitizeText('<embed src="evil.swf">')).toBe('')
      })

      it('should remove form tags', () => {
        expect(sanitizeText('<form action="evil.com"><input></form>')).toBe('')
      })

      it('should remove style tags', () => {
        expect(sanitizeText('<style>body{display:none}</style>')).toBe('')
      })

      it('should remove link tags', () => {
        expect(sanitizeText('<link rel="stylesheet" href="evil.css">')).toBe('')
      })
    })

    describe('XSS Prevention - All HTML Tags Removed', () => {
      it('should remove div tags but keep content', () => {
        expect(sanitizeText('<div>Content</div>')).toBe('Content')
      })

      it('should remove span tags but keep content', () => {
        expect(sanitizeText('<span>Content</span>')).toBe('Content')
      })

      it('should remove paragraph tags but keep content', () => {
        expect(sanitizeText('<p>Content</p>')).toBe('Content')
      })

      it('should remove heading tags but keep content', () => {
        expect(sanitizeText('<h1>Title</h1>')).toBe('Title')
      })

      it('should remove anchor tags but keep content', () => {
        expect(sanitizeText('<a href="http://example.com">Link</a>')).toBe('Link')
      })

      it('should remove bold/italic tags but keep content', () => {
        expect(sanitizeText('<b>Bold</b> <i>Italic</i>')).toBe('Bold Italic')
      })

      it('should remove img tags completely', () => {
        expect(sanitizeText('<img src="image.png" alt="Image">')).toBe('')
      })
    })

    describe('XSS Prevention - JavaScript URLs', () => {
      it('should remove javascript: URLs in links', () => {
        expect(sanitizeText('<a href="javascript:alert(1)">Click</a>')).toBe('Click')
      })

      it('should remove data: URLs', () => {
        expect(sanitizeText('<a href="data:text/html,<script>alert(1)</script>">Link</a>')).toBe('Link')
      })
    })

    describe('XSS Prevention - Encoding Bypass Attempts', () => {
      it('should handle HTML entities', () => {
        expect(sanitizeText('&lt;script&gt;alert(1)&lt;/script&gt;')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
      })

      it('should handle Unicode escapes in tags', () => {
        expect(sanitizeText('<\u0073cript>alert(1)</script>')).toBe('')
      })
    })
  })

  // =========================================================================
  // sanitizeRichText TESTS
  // =========================================================================
  describe('sanitizeRichText', () => {
    describe('Empty/Null Input Handling', () => {
      it('should return empty string for null input', () => {
        expect(sanitizeRichText(null)).toBe('')
      })

      it('should return empty string for undefined input', () => {
        expect(sanitizeRichText(undefined)).toBe('')
      })

      it('should return empty string for empty string input', () => {
        expect(sanitizeRichText('')).toBe('')
      })
    })

    describe('Allowed Tags', () => {
      it('should preserve bold tags', () => {
        expect(sanitizeRichText('<b>Bold text</b>')).toBe('<b>Bold text</b>')
      })

      it('should preserve italic tags', () => {
        expect(sanitizeRichText('<i>Italic text</i>')).toBe('<i>Italic text</i>')
      })

      it('should preserve em tags', () => {
        expect(sanitizeRichText('<em>Emphasized</em>')).toBe('<em>Emphasized</em>')
      })

      it('should preserve strong tags', () => {
        expect(sanitizeRichText('<strong>Strong</strong>')).toBe('<strong>Strong</strong>')
      })

      it('should preserve anchor tags with href', () => {
        expect(sanitizeRichText('<a href="https://example.com">Link</a>')).toBe('<a href="https://example.com">Link</a>')
      })

      it('should preserve paragraph tags', () => {
        expect(sanitizeRichText('<p>Paragraph</p>')).toBe('<p>Paragraph</p>')
      })

      it('should preserve br tags', () => {
        expect(sanitizeRichText('Line 1<br>Line 2')).toBe('Line 1<br />Line 2')
      })

      it('should preserve nested allowed tags', () => {
        expect(sanitizeRichText('<p><b>Bold in paragraph</b></p>')).toBe('<p><b>Bold in paragraph</b></p>')
      })
    })

    describe('Disallowed Tags Removed', () => {
      it('should remove script tags', () => {
        expect(sanitizeRichText('<script>alert(1)</script>')).toBe('')
      })

      it('should remove div tags but keep content', () => {
        expect(sanitizeRichText('<div>Content</div>')).toBe('Content')
      })

      it('should remove span tags but keep content', () => {
        expect(sanitizeRichText('<span>Content</span>')).toBe('Content')
      })

      it('should remove img tags', () => {
        expect(sanitizeRichText('<img src="image.png">')).toBe('')
      })

      it('should remove iframe tags', () => {
        expect(sanitizeRichText('<iframe src="evil.com"></iframe>')).toBe('')
      })
    })

    describe('Allowed URL Schemes', () => {
      it('should allow http links', () => {
        expect(sanitizeRichText('<a href="http://example.com">Link</a>')).toBe('<a href="http://example.com">Link</a>')
      })

      it('should allow https links', () => {
        expect(sanitizeRichText('<a href="https://example.com">Link</a>')).toBe('<a href="https://example.com">Link</a>')
      })

      it('should allow mailto links', () => {
        expect(sanitizeRichText('<a href="mailto:test@example.com">Email</a>')).toBe('<a href="mailto:test@example.com">Email</a>')
      })

      it('should remove javascript: URLs', () => {
        const result = sanitizeRichText('<a href="javascript:alert(1)">Link</a>')
        expect(result).not.toContain('javascript:')
      })

      it('should remove data: URLs', () => {
        const result = sanitizeRichText('<a href="data:text/html,<script>alert(1)</script>">Link</a>')
        expect(result).not.toContain('data:')
      })
    })

    describe('Disallowed Attributes Removed', () => {
      it('should remove onclick from allowed tags', () => {
        const result = sanitizeRichText('<b onclick="alert(1)">Bold</b>')
        expect(result).not.toContain('onclick')
        expect(result).toContain('<b>Bold</b>')
      })

      it('should remove style attribute', () => {
        const result = sanitizeRichText('<b style="color:red">Bold</b>')
        expect(result).not.toContain('style')
        expect(result).toContain('<b>Bold</b>')
      })

      it('should remove class attribute', () => {
        const result = sanitizeRichText('<b class="highlight">Bold</b>')
        expect(result).not.toContain('class')
        expect(result).toContain('<b>Bold</b>')
      })

      it('should preserve only href on anchor tags', () => {
        const result = sanitizeRichText('<a href="https://example.com" onclick="alert(1)" class="link">Link</a>')
        expect(result).toBe('<a href="https://example.com">Link</a>')
      })
    })
  })

  // =========================================================================
  // sanitizeArray TESTS
  // =========================================================================
  describe('sanitizeArray', () => {
    describe('Empty/Null Input Handling', () => {
      it('should return empty array for null input', () => {
        expect(sanitizeArray(null)).toEqual([])
      })

      it('should return empty array for undefined input', () => {
        expect(sanitizeArray(undefined)).toEqual([])
      })

      it('should return empty array for empty array input', () => {
        expect(sanitizeArray([])).toEqual([])
      })

      it('should return empty array for non-array input', () => {
        expect(sanitizeArray('not an array' as any)).toEqual([])
      })
    })

    describe('Array Processing', () => {
      it('should sanitize all strings in array and filter empty results', () => {
        // sanitizeArray filters out empty strings after sanitization
        const input = ['<b>Bold</b>', '<script>alert(1)</script>', 'Plain text']
        expect(sanitizeArray(input)).toEqual(['Bold', 'Plain text'])
      })

      it('should filter out empty strings after sanitization', () => {
        const input = ['<script>alert(1)</script>', '<img src="x">', 'Valid']
        expect(sanitizeArray(input)).toEqual(['Valid'])
      })

      it('should trim whitespace from all items', () => {
        const input = ['  item1  ', '  item2  ']
        expect(sanitizeArray(input)).toEqual(['item1', 'item2'])
      })

      it('should preserve array order', () => {
        const input = ['first', 'second', 'third']
        expect(sanitizeArray(input)).toEqual(['first', 'second', 'third'])
      })

      it('should handle mixed content', () => {
        const input = ['Hello', '<div>World</div>', '<script>evil</script>']
        expect(sanitizeArray(input)).toEqual(['Hello', 'World'])
      })
    })
  })

  // =========================================================================
  // sanitizeObject TESTS
  // =========================================================================
  describe('sanitizeObject', () => {
    describe('Basic Functionality', () => {
      it('should sanitize specified string fields', () => {
        const input = {
          name: '<script>alert(1)</script>',
          email: 'test@example.com',
          bio: '<b>Bio</b>'
        }
        const result = sanitizeObject(input, ['name', 'bio'])
        expect(result.name).toBe('')
        expect(result.bio).toBe('Bio')
        expect(result.email).toBe('test@example.com')
      })

      it('should not modify non-specified fields', () => {
        const input = {
          name: '<script>evil</script>',
          description: '<b>Bold</b>'
        }
        const result = sanitizeObject(input, ['name'])
        expect(result.name).toBe('')
        expect(result.description).toBe('<b>Bold</b>') // Unchanged
      })

      it('should skip non-string fields', () => {
        const input = {
          name: 'John',
          age: 25,
          active: true
        }
        const result = sanitizeObject(input, ['name', 'age' as any, 'active' as any])
        expect(result.name).toBe('John')
        expect(result.age).toBe(25)
        expect(result.active).toBe(true)
      })

      it('should return a new object (immutability)', () => {
        const input = { name: 'John' }
        const result = sanitizeObject(input, ['name'])
        expect(result).not.toBe(input)
        expect(result).toEqual({ name: 'John' })
      })

      it('should handle empty fields array', () => {
        const input = { name: '<b>Bold</b>' }
        const result = sanitizeObject(input, [])
        expect(result.name).toBe('<b>Bold</b>')
      })
    })

    describe('Complex Objects', () => {
      it('should handle objects with multiple fields to sanitize', () => {
        const input = {
          firstName: '<script>alert(1)</script>John',
          lastName: '<img src="x">Doe',
          email: 'john@example.com',
          phone: '123-456-7890'
        }
        const result = sanitizeObject(input, ['firstName', 'lastName'])
        expect(result.firstName).toBe('John')
        expect(result.lastName).toBe('Doe')
        expect(result.email).toBe('john@example.com')
        expect(result.phone).toBe('123-456-7890')
      })

      it('should preserve object structure with nested values', () => {
        const input = {
          user: { name: 'John' }, // Nested object - won't be sanitized
          title: '<b>Title</b>'
        }
        const result = sanitizeObject(input, ['title'])
        expect(result.user).toEqual({ name: 'John' })
        expect(result.title).toBe('Title')
      })
    })
  })

  // =========================================================================
  // INTEGRATION TESTS
  // =========================================================================
  describe('Integration Tests', () => {
    it('should handle complex XSS attack vector', () => {
      const attack = `<img src=x onerror="&#0000106&#0000097&#0000118&#0000097&#0000115&#0000099&#0000114&#0000105&#0000112&#0000116&#0000058&#0000097&#0000108&#0000101&#0000114&#0000116&#0000040&#0000039&#0000088&#0000083&#0000083&#0000039&#0000041">`
      expect(sanitizeText(attack)).toBe('')
    })

    it('should handle SVG-based XSS attack', () => {
      const attack = '<svg onload="alert(1)">'
      expect(sanitizeText(attack)).toBe('')
    })

    it('should handle mixed legitimate and malicious content', () => {
      const mixed = 'Hello <script>alert("XSS")</script> World <b>Bold</b> Text'
      expect(sanitizeText(mixed)).toBe('Hello  World Bold Text')
    })

    it('should handle real-world user input scenarios', () => {
      const userInput = {
        name: 'John <script>alert("XSS")</script> Doe',
        bio: 'I am a <b>developer</b> who loves <i>coding</i>!',
        website: '<a href="https://example.com">My Site</a>'
      }

      const sanitizedName = sanitizeText(userInput.name)
      const sanitizedBio = sanitizeRichText(userInput.bio)
      const sanitizedWebsite = sanitizeText(userInput.website)

      expect(sanitizedName).toBe('John  Doe')
      expect(sanitizedBio).toBe('I am a <b>developer</b> who loves <i>coding</i>!')
      expect(sanitizedWebsite).toBe('My Site')
    })
  })
})
