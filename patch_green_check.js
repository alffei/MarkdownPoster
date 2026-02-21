const fs = require('fs');
const file = './components/WeChatPreview.tsx';
let data = fs.readFileSync(file, 'utf8');

// The objective is to make the green checkmark aware of the theme primary color.
// In WeChatPreview.tsx:
// iconBackgroundMap - check: 'rgba(22, 163, 74, 0.12)' -> check: hexToRgba(config.primaryColor, 0.12)
// iconColorMap - check: '#16A34A' -> check: config.primaryColor
// isInspirationChecklist border: '1px solid #edf1f7' -> border: `1px solid ${hexToRgba(config.primaryColor, 0.1)}`
// isInspirationChecklist background: 'linear-gradient(180deg, #f8fafc 0%, #f3f4f6 100%)' -> background: `linear-gradient(180deg, ${hexToRgba(config.primaryColor, 0.05)} 0%, ${hexToRgba(config.primaryColor, 0.02)} 100%)`

data = data.replace(/check: 'rgba\(22, 163, 74, 0\.12\)',/g, "check: hexToRgba(config.primaryColor, 0.12),");
data = data.replace(/check: '#16A34A',/g, "check: config.primaryColor,");

data = data.replace(/background: 'linear-gradient\(180deg, #f8fafc 0%, #f3f4f6 100%\)',/g, "background: `linear-gradient(180deg, ${hexToRgba(config.primaryColor, 0.05)} 0%, ${hexToRgba(config.primaryColor, 0.02)} 100%)`,");
data = data.replace(/border: '1px solid #edf1f7',/g, "border: `1px solid ${hexToRgba(config.primaryColor, 0.1)}`,");
data = data.replace(/border: `1px solid \$\{hexToRgba\(config\.primaryColor, 0\.18\)\}`,/g, "border: `1px solid ${hexToRgba(config.primaryColor, 0.1)}`,"); // Just in case it was applied to the generic quote box

fs.writeFileSync(file, data);
console.log('Patch applied successfully.');
