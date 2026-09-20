with open('src/components/impact/ImpactAnalyticsPanel.tsx', 'r') as f:
    content = f.read()

# Fix the trailing )}
content = content.replace('      )}\n\n    </div>\n  );\n};\n', '      </div>\n\n    </div>\n  );\n};\n')

# Fix the min-w-0 for the cards
content = content.replace(
    '<div className=\"flex-1 pr-2\">',
    '<div className=\"flex-1 pr-2 min-w-0\">'
)
content = content.replace(
    'className=\"flex items-center justify-between p-1.5 rounded-xl hover:bg-white/10 transition\"',
    'className=\"flex items-center justify-between p-1.5 rounded-xl hover:bg-white/10 transition min-w-0\"'
)

with open('src/components/impact/ImpactAnalyticsPanel.tsx', 'w') as f:
    f.write(content)
print('Fixed trailing brace and added min-w-0 to cards')
