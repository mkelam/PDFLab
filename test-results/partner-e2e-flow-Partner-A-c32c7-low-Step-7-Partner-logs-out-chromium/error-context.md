# Page snapshot

```yaml
- dialog "Unhandled Runtime Error" [ref=e4]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e7]:
        - navigation [ref=e8]:
          - button "previous" [disabled] [ref=e9]:
            - img "previous" [ref=e10]
          - button "next" [disabled] [ref=e12]:
            - img "next" [ref=e13]
          - generic [ref=e15]: 1 of 1 error
          - generic [ref=e16]:
            - text: Next.js (14.2.16) is outdated
            - link "(learn more)" [ref=e18] [cursor=pointer]:
              - /url: https://nextjs.org/docs/messages/version-staleness
        - button "Close" [ref=e19] [cursor=pointer]:
          - img [ref=e21]
      - heading "Unhandled Runtime Error" [level=1] [ref=e24]
      - paragraph [ref=e25]: "TypeError: Cannot read properties of null (reading 'toLocaleString')"
    - generic [ref=e26]:
      - heading "Source" [level=2] [ref=e27]
      - generic [ref=e28]:
        - link "app\\[slug]\\page.tsx (332:62) @ toLocaleString" [ref=e30] [cursor=pointer]:
          - generic [ref=e31]: app\[slug]\page.tsx (332:62) @ toLocaleString
          - img [ref=e32]
        - generic [ref=e36]: "330 | </h1> 331 | <p className=\"text-muted-foreground mt-1\"> > 332 | {partner.platform} • {partner.follower_count.toLocaleString()} followers | ^ 333 | </p> 334 | </div> 335 | <div className=\"flex flex-wrap gap-2\">"
      - heading "Call Stack" [level=2] [ref=e37]
      - button "Show collapsed frames" [ref=e38] [cursor=pointer]
```