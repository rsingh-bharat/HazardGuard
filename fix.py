with open('src/components/impact/LayerControls.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '<div className=\"flex items-center justify-between p-1.5 rounded-xl hover:bg-white/10 transition\">',
    '<div className=\"flex items-center justify-between p-1.5 rounded-xl hover:bg-white/10 transition shrink-0\">'
)

with open('src/components/impact/LayerControls.tsx', 'w') as f:
    f.write(content)
