const fs = require('fs');
const file = './components/WeChatPreview.tsx';
let data = fs.readFileSync(file, 'utf8');

// Fix H1 Inspiration Cover
data = data.replace(/background: 'linear-gradient\(135deg, #fb923c 0%, #f97316 45%, #ea580c 100%\)',/g, 
  "background: `linear-gradient(135deg, ${hexToRgba(config.primaryColor, 0.8)} 0%, ${config.primaryColor} 100%)`,");
data = data.replace(/boxShadow: '0 18px 36px rgba\(234, 88, 12, 0\.28\)',/g,
  "boxShadow: `0 18px 36px ${hexToRgba(config.primaryColor, 0.28)}`,");

// Fix p with bulb icon
data = data.replace(/color: '#B45309',\s*\/\/\s*fallback/g, "color: config.primaryColor,"); // in case
data = data.replace(/color: '#B45309',/g, "color: config.primaryColor,");
data = data.replace(/background: 'rgba\(245, 158, 11, 0\.16\)',/g, "background: hexToRgba(config.primaryColor, 0.16),");

// Fix h3 color hardcode override
data = data.replace(/gap: '10px',\n\s*color: '#111827',/g, 
  "gap: '10px',\n                color: (themeStyle.h3 as any)?.color || '#111827',");

// Fix Inspiration section h2 divider
data = data.replace(/background: `linear-gradient\(90deg, \$\{hexToRgba\(config\.primaryColor, 0\.2\)\} 0%, rgba\(251, 146, 60, 0\.05\) 100%\)`,/g,
  "background: `linear-gradient(90deg, ${hexToRgba(config.primaryColor, 0.2)} 0%, ${hexToRgba(config.primaryColor, 0.02)} 100%)`,");

// Fix Inspiration quote styles warning/check
data = data.replace(/background: 'linear-gradient\(180deg, #fff7ed 0%, #fff1e7 100%\)',/g,
  "background: `linear-gradient(180deg, ${hexToRgba('#f59e0b', 0.1)} 0%, ${hexToRgba('#f59e0b', 0.05)} 100%)`,");
data = data.replace(/borderLeft: `4px solid \$\{config\.primaryColor\}`,\n\s*background: `linear-gradient/g,
  "borderLeft: `4px solid #f59e0b`,\n                background: `linear-gradient");
data = data.replace(/boxShadow: `inset 0 0 0 1px \$\{hexToRgba\(config\.primaryColor, 0\.15\)\}`,/g,
  "boxShadow: `inset 0 0 0 1px ${hexToRgba('#f59e0b', 0.2)}`,");

fs.writeFileSync(file, data);
console.log('Patch applied successfully.');
