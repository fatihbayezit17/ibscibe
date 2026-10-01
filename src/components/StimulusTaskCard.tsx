import React from 'react';

interface StimulusTaskProps {
  promptText: string;
  wordCountMin?: number;
  wordCountMax?: number;
  options: string[]; // Örn: ['Article', 'Proposal', 'Review']
  selectedOption?: string;
  onSelectOption?: (option: string) => void;
}

export const StimulusTaskCard: React.FC<StimulusTaskProps> = ({
  promptText,
  wordCountMin = 450,
  wordCountMax = 600,
  options,
  selectedOption,
  onSelectOption,
}) => {
  return (
    <div className="bg-white border-2 border-zinc-900 rounded-lg p-6 shadow-sm max-w-3xl mx-auto font-serif text-zinc-900 mb-6">
      {/* Üst Yönerge */}
      <div className="border-b-2 border-zinc-900 pb-4 mb-6">
        <h2 className="text-lg font-bold leading-snug font-sans">
          Complete the following task. Use the most appropriate text type
          based on the suggestions. Write between {wordCountMin} and{' '}
          {wordCountMax} words.
        </h2>
      </div>

      {/* Senaryo / Metin Kısmı */}
      <div className="text-base leading-relaxed mb-8 font-sans text-zinc-800">
        <p>{promptText}</p>
      </div>

      {/* En Alt Kısımdaki Metin Türü Kutuları (Revision Village / Resmi Sınav Formatı) */}
      <div className="grid grid-cols-3 gap-0 border-2 border-zinc-900 rounded overflow-hidden text-center font-sans font-semibold">
        {options.map((option, index) => {
          const isSelected = selectedOption === option;
          return (
            <div
              key={option}
              onClick={() => onSelectOption && onSelectOption(option)}
              className={`py-3 px-4 cursor-pointer transition-colors ${
                index !== options.length - 1 ? 'border-r-2 border-zinc-900' : ''
              } ${
                isSelected
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white hover:bg-zinc-100 text-zinc-900'
              }`}
            >
              {option}
            </div>
          );
        })}
      </div>
    </div>
  );
};