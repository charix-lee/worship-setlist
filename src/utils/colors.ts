export const getServiceTypeColors = (serviceType: string): { bg: string; text: string } => {
  const colorMap: Record<string, { bg: string; text: string }> = {
    '주일 1부': { bg: '#e5d9ff', text: '#734dc7' },
    '청년부': { bg: '#d9e8ff', text: '#4d78cc' },
    '수요예배': { bg: '#d1f5eb', text: '#268c73' },
    '주일 2부': { bg: '#ffe5d9', text: '#cc664d' },
    '주일 3부': { bg: '#fff0d1', text: '#bf8c33' },
    '금요기도회': { bg: '#ffdee5', text: '#c74d66' },
    '새벽기도회': { bg: '#d9f0ff', text: '#4085b8' },
    '기타': { bg: '#ebe5f2', text: '#7a6b94' },
  };
  return colorMap[serviceType] || { bg: '#f3f4f6', text: '#6b7280' };
};
