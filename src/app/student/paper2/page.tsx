'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Paper2Portal() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [answers, setAnswers] = useState<Record<number, any>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setStudentId(user.id);
    });
  }, []);
  
  const passages = [
    {
      id: 1,
      title: "The Rise of Minimalism",
      theme: "Lifestyle & Consumerism",
      text: `In recent years, the concept of minimalism has gained significant traction, particularly among younger generations seeking a more intentional lifestyle. Minimalism, at its core, is about living with less and focusing on what truly matters. This movement encourages individuals to declutter their lives, both physically and mentally, to make room for experiences and relationships that bring genuine happiness.
[ – 1 – ]
The rise of minimalism can be attributed to several factors. Firstly, the digital age has inundated us with information and choices, often leading to decision fatigue and stress. By simplifying their surroundings, minimalists aim to reduce this overwhelm and create a more peaceful environment. Secondly, there is a growing awareness of the environmental impact of consumerism. Many minimalists choose to own fewer possessions as a way to reduce their carbon footprint and promote sustainability.
[ – 2 – ]
Moreover, minimalism is not just about owning fewer things; it also extends to how people spend their time. Minimalists often prioritize activities that align with their values and bring them joy, such as spending time with loved ones, pursuing hobbies, or engaging in community service. This shift in focus from material possessions to meaningful experiences is a key aspect of the minimalist lifestyle.
[ – 3 – ]
Critics of minimalism argue that it is a privilege to be able to choose to live with less, as not everyone has the financial stability to make such a choice. However, proponents counter that minimalism is not about deprivation but about making conscious decisions that lead to a more fulfilling life.
[ – 4 – ]
In conclusion, minimalism offers a pathway to a more intentional and satisfying life by encouraging individuals to focus on what truly matters. As more people embrace this lifestyle, it has the potential to foster a more sustainable and connected world.`,
      questions: {
        a: {
          prompt: "Choose the four true statements.",
          correct: ["B", "E", "G", "H"],
          options: [
            { id: "A", text: "Minimalism is solely about reducing physical possessions." },
            { id: "B", text: "The digital age has contributed to the rise of minimalism." },
            { id: "C", text: "Minimalists believe that owning more things leads to happiness." },
            { id: "D", text: "Minimalism is only about environmental sustainability." },
            { id: "E", text: "Minimalism encourages focusing on meaningful experiences." },
            { id: "F", text: "Critics argue that minimalism is accessible to everyone." },
            { id: "G", text: "Minimalism promotes decision fatigue and stress." },
            { id: "H", text: "Minimalism can lead to a more fulfilling life." }
          ]
        },
        b: {
          prompt: "Find the words that complete the following sentences. Answer using the words as they appear in paragraphs 2–4.",
          items: [
            "Minimalists aim to reduce...",
            "Many minimalists choose to own fewer possessions to promote...",
            "Minimalism extends to how people spend their..."
          ],
          correct: ["stress", "sustainability", "time"]
        },
        c: {
          prompt: "Choose an appropriate heading from the list that completes each gap in the text ([ – 1 – ] to [ – 4 – ]).",
          headings: [
            "A. It enhances decision making",
            "B. It values experiences over possessions",
            "C. It limits consumerism",
            "D. It promotes intentional living",
            "E. It reduces stress",
            "F. It encourages sustainability",
            "G. It fosters connections",
            "H. It challenges privilege"
          ],
          correct: { "1": "E", "2": "C", "3": "B", "4": "H" }
        },
        d: {
          prompt: "The writer concludes by saying that…",
          correct: "B",
          options: [
            "A. minimalism is about deprivation.",
            "B. minimalism can lead to a more connected world.",
            "C. minimalism is only for the financially stable.",
            "D. minimalism discourages meaningful relationships."
          ]
        }
      }
    },
    {
      id: 2,
      title: "AI and the Future of Human Creativity",
      theme: "Technology & Culture",
      text: `In recent years, the rapid advancement of artificial intelligence has sparked intense debate across the globe, particularly concerning its encroachment into traditionally human domains such as art, literature, and music. Generative AI models are now capable of producing stunning paintings, composing intricate symphonies, and even drafting coherent essays in a matter of seconds. This technological leap has forced society to reevaluate the very definition of creativity and the value we assign to human labor.
[ – 1 – ]
Proponents of AI tools argue that these systems serve as powerful collaborative partners rather than replacements for human artists. By handling repetitive tasks, generating preliminary sketches, or suggesting alternative phrasing, AI can alleviate creative burnout and allow creators to push boundaries further. For instance, graphic designers can use AI to rapidly prototype concepts, freeing up time to focus on emotional depth and narrative nuance—elements that algorithms still struggle to authentically replicate.
[ – 2 – ]
On the other hand, critics and copyright advocates raise significant ethical concerns regarding the training data used by these models. Many AI systems ingest vast amounts of copyrighted material scraped from the internet without the explicit consent or compensation of the original creators. This practice has led to widespread protests, legal challenges, and a growing fear among emerging artists that their unique styles might be mimicked and commercialized by tech corporations.
[ – 3 – ]
Furthermore, there is an ongoing philosophical discussion about whether art created by a machine holds genuine emotional resonance. True art often stems from lived human experiences, vulnerability, and mortality—traits that code and silicon simply do not possess. When a machine generates a poem about heartbreak, it is merely calculating probability distributions of words rather than processing actual grief.
[ – 4 – ]
Ultimately, as artificial intelligence becomes deeply integrated into our daily workflows, humanity must navigate the delicate balance between technological innovation and the protection of cultural integrity. Ensuring ethical regulation and respecting authorship will be crucial in shaping a future where technology elevates, rather than diminishes, human expression.`,
      questions: {
        a: {
          prompt: "Choose the four true statements.",
          correct: ["B", "C", "E", "H"],
          options: [
            { id: "A", text: "AI is exclusively used in the fields of engineering and science." },
            { id: "B", text: "Generative AI can create visual art and musical compositions quickly." },
            { id: "C", text: "Supporters view AI as a collaborator that can help prevent creative burnout." },
            { id: "D", text: "Algorithms can effortlessly replicate deep emotional nuance and vulnerability." },
            { id: "E", text: "Some AI models are trained on copyrighted works without creator compensation." },
            { id: "F", text: "Emerging artists worry about corporations mimicking their unique styles." },
            { id: "G", text: "Machines experience genuine grief when writing poetry about heartbreak." },
            { id: "H", text: "Ethical regulation is seen as important for protecting cultural integrity." }
          ]
        },
        b: {
          prompt: "Find the words that complete the following sentences. Answer using the words as they appear in paragraphs 2–4.",
          items: [
            "Proponents view AI tools as powerful collaborative...",
            "Critics and copyright advocates raise significant ethical...",
            "True art often stems from lived human experiences and..."
          ],
          correct: ["partners", "concerns", "vulnerability"]
        },
        c: {
          prompt: "Choose an appropriate heading from the list that completes each gap in the text ([ – 1 – ] to [ – 4 – ]).",
          headings: [
            "A. The philosophical debate over emotion",
            "B. Ethical concerns and copyright issues",
            "C. AI as a collaborative design partner",
            "D. The economic impact on major tech corporations",
            "E. Reevaluating the definition of human labor",
            "F. The history of machine learning algorithms",
            "G. Navigating a balanced future for art",
            "H. Public enthusiasm for automated music"
          ],
          correct: { "1": "C", "2": "B", "3": "A", "4": "G" }
        },
        d: {
          prompt: "The writer concludes by saying that…",
          correct: "B",
          options: [
            "A. technology will completely replace human expression.",
            "B. ethical regulation and author protection are crucial moving forward.",
            "C. copyright laws should be completely abolished for tech companies.",
            "D. humanity should reject artificial intelligence in all creative fields."
          ]
        }
      }
    },
    {
      id: 3,
      title: "Transforming Modern Cities",
      theme: "Urban Planning & Environment",
      text: `Urban centers worldwide are undergoing a major transformation as city planners increasingly prioritize pedestrian zones, green corridors, and public gathering spaces over asphalt highways. For decades, twentieth-century urban design heavily favored automobiles, resulting in congested streets, heightened air pollution, and fragmented communities. Today, forward-thinking municipalities are redesigning their layouts to put people first, recognizing that healthy cities depend on accessible and vibrant public spaces.
[ – 1 – ]
One of the most notable trends in modern urban renewal is the conversion of old industrial zones and disused railway lines into sprawling linear parks. These green lungs not only provide residents with safe recreational areas for jogging and cycling, but they also act as crucial urban cooling mechanisms. In an era marked by rising global temperatures, urban vegetation helps combat the dangerous 'heat island' effect, significantly lowering local temperatures during scorching summer months.
[ – 2 – ]
Moreover, pedestrianizing city centers has shown remarkable economic benefits for local small businesses. When streets are closed to cars and transformed into outdoor dining and walking districts, foot traffic increases substantially. Shoppers are more likely to linger, explore independent boutiques, and support neighborhood cafes compared to motorists who simply drive through without stopping.
[ – 3 – ]
Despite these clear advantages, urban transformation projects often face strong resistance from motorists and certain business owners who fear parking shortages and logistical delays. Transitioning away from car-dependent infrastructure requires substantial public investment, efficient public transit alternatives, and patient political leadership to convince skeptics of long-term benefits.
[ – 4 – ]
In conclusion, reshaping our cities into greener, pedestrian-friendly habitats is no longer just an aesthetic choice; it is an ecological and social necessity. As urban populations continue to grow, creating inclusive public spaces will define the livability and resilience of future societies.`,
      questions: {
        a: {
          prompt: "Choose the four true statements.",
          correct: ["B", "C", "F", "H"],
          options: [
            { id: "A", text: "Twentieth-century urban design placed high priority on pedestrian zones." },
            { id: "B", text: "Linear parks are often created from converted industrial zones or old railways." },
            { id: "C", text: "Urban vegetation helps mitigate the dangerous urban heat island effect." },
            { id: "D", text: "Pedestrianizing downtown areas usually results in a decrease in foot traffic." },
            { id: "E", text: "Motorists are more likely to stop and explore local boutiques than pedestrians." },
            { id: "F", text: "Urban transformation projects frequently encounter resistance from drivers." },
            { id: "G", text: "Shifting away from car-dependent infrastructure requires substantial investment." },
            { id: "H", text: "Reshaping cities into pedestrian-friendly habitats is considered a social necessity." }
          ]
        },
        b: {
          prompt: "Find the words that complete the following sentences. Answer using the words as they appear in paragraphs 2–4.",
          items: [
            "Linear parks provide residents with safe recreational areas for jogging and...",
            "Pedestrianizing city centers has shown remarkable economic benefits for...",
            "Transitioning away from car-dependent infrastructure requires substantial public..."
          ],
          correct: ["cycling", "businesses", "investment"]
        },
        c: {
          prompt: "Choose an appropriate heading from the list that completes each gap in the text ([ – 1 – ] to [ – 4 – ]).",
          headings: [
            "A. The economic boost for local businesses",
            "B. Overcoming resistance and logistical hurdles",
            "C. Combating the urban heat island effect",
            "D. The historical dominance of the automobile",
            "E. Future projections for rural housing",
            "F. Transforming concrete into green corridors",
            "G. The decline of public transportation systems",
            "H. Aesthetic preferences in modern architecture"
          ],
          correct: { "1": "F", "2": "A", "3": "B", "4": "H" }
        },
        d: {
          prompt: "The writer concludes by saying that…",
          correct: "B",
          options: [
            "A. cities should revert back to highway-focused designs.",
            "B. green and pedestrian-friendly cities represent a vital social and ecological necessity.",
            "C. public transportation is no longer relevant in modern urban planning.",
            "D. urban growth should be halted entirely to protect nature."
          ]
        }
      }
    },
    {
      id: 4,
      title: "The Zero Waste Movement",
      theme: "Sustainability & Environment",
      text: `The concept of zero waste has gained traction as individuals and communities seek to reduce their environmental impact and promote sustainability. Zero waste is a philosophy and lifestyle that aims to minimize waste generation by rethinking consumption patterns and encouraging the reuse, recycling, and composting of materials. This approach challenges the traditional linear economy, which follows a 'take, make, dispose' model, and advocates for a circular system where resources are kept in use for as long as possible.
[ – 1 – ]
One of the primary goals of zero waste is to reduce the amount of waste sent to landfills and incinerators. By diverting waste from these disposal methods, zero waste practices help conserve natural resources, reduce pollution, and decrease greenhouse gas emissions. This is achieved through strategies such as composting organic waste, recycling materials like paper, glass, and metals, and repurposing items that would otherwise be discarded.
[ – 2 – ]
Moreover, zero waste encourages a shift in consumer behavior towards more sustainable choices. This includes prioritizing products with minimal packaging, choosing reusable items over single-use products, and supporting companies that adopt environmentally friendly practices. By making conscious purchasing decisions, individuals can reduce their ecological footprint and contribute to a more sustainable economy.
[ – 3 – ]
Zero waste also promotes innovation and creativity in waste management. Communities and businesses are developing new solutions to tackle waste challenges, such as creating biodegradable packaging, implementing deposit return schemes, and establishing repair cafes where people can fix broken items instead of discarding them. These initiatives not only reduce waste but also foster a culture of sustainability and resourcefulness.
[ – 4 – ]
However, achieving zero waste can be challenging, as it requires systemic changes and collaboration among various stakeholders. Governments, businesses, and individuals must work together to create policies and infrastructure that support waste reduction efforts. This includes investing in recycling facilities, providing education and resources for sustainable living, and incentivizing companies to adopt circular economy practices.
In conclusion, zero waste offers a comprehensive approach to reducing environmental impact and promoting sustainability. By rethinking consumption patterns and embracing innovative waste management solutions, individuals and communities can contribute to a more sustainable future. As awareness of environmental issues continues to grow, the zero waste movement is likely to play an increasingly important role in shaping sustainable practices and policies.`,
      questions: {
        a: {
          prompt: "Choose the four true statements.",
          correct: ["C", "D", "G", "H"],
          options: [
            { id: "A", text: "Zero waste is a philosophy that supports the traditional linear economy." },
            { id: "B", text: "Zero waste discourages recycling and composting." },
            { id: "C", text: "Zero waste practices help reduce pollution and greenhouse gas emissions." },
            { id: "D", text: "Zero waste encourages consumer behavior towards sustainable choices." },
            { id: "E", text: "Zero waste has no impact on innovation and creativity in waste management." },
            { id: "F", text: "Zero waste is only about reducing waste sent to landfills." },
            { id: "G", text: "Achieving zero waste requires collaboration among various stakeholders." },
            { id: "H", text: "Zero waste offers a comprehensive approach to sustainability." }
          ]
        },
        b: {
          prompt: "Find the words that complete the following sentences. Answer using the words as they appear in the text.",
          items: [
            "Zero waste is a philosophy and lifestyle that aims to minimize waste generation by...",
            "By diverting waste from these disposal methods, zero waste practices help conserve...",
            "Zero waste encourages a shift in consumer behavior towards more..."
          ],
          correct: ["rethinking consumption patterns", "natural resources", "sustainable choices"]
        },
        c: {
          prompt: "Choose an appropriate heading from the list that completes each gap in the text ([ – 1 – ] to [ – 4 – ]).",
          headings: [
            "A. Innovation in waste management",
            "B. Zero waste and the circular economy",
            "C. Zero waste and stakeholder collaboration",
            "D. The philosophy of zero waste",
            "E. Challenges of achieving zero waste",
            "F. The future of zero waste",
            "G. Consumer behavior and zero waste",
            "H. Environmental benefits of zero waste"
          ],
          correct: { "1": "H", "2": "G", "3": "A", "4": "E" }
        },
        d: {
          prompt: "The writer concludes by saying that…",
          correct: "C",
          options: [
            "A. zero waste is only for those who can afford it.",
            "B. zero waste is a temporary trend.",
            "C. zero waste offers a comprehensive approach to reducing environmental impact.",
            "D. zero waste is too difficult to achieve."
          ]
        }
      }
    }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentPassage = passages[currentIndex];

  const handleAnswerChange = (qType: string, val: any, extraKey?: any) => {
    setAnswers(prev => {
      const pAns = prev[currentPassage.id] || { a: [], b: {}, c: {}, d: '' };
      if (qType === 'a') {
        const list = pAns.a.includes(val) ? pAns.a.filter((item: string) => item !== val) : [...pAns.a, val];
        return { ...prev, [currentPassage.id]: { ...pAns, a: list } };
      } else if (qType === 'b') {
        return { ...prev, [currentPassage.id]: { ...pAns, b: { ...pAns.b, [extraKey]: val } } };
      } else if (qType === 'c') {
        return { ...prev, [currentPassage.id]: { ...pAns, c: { ...pAns.c, [extraKey]: val } } };
      } else if (qType === 'd') {
        return { ...prev, [currentPassage.id]: { ...pAns, d: val } };
      }
      return prev;
    });
  };

  const handleNext = () => {
    if (currentIndex < passages.length - 1) {
      setCurrentIndex(currentIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmitExam = async () => {
    if (!studentId) {
      alert('You must be logged in as a student to submit.');
      return;
    }
    if (!confirm('Are you sure you want to submit your Paper 2 exam responses?')) return;

    setSubmitting(true);
    try {
      let totalScore = 0;
      let maxPossibleScore = passages.length * 12;
      const detailedFeedback: any = {};

      passages.forEach(p => {
        const pAns = answers[p.id] || { a: [], b: {}, c: {}, d: '' };
        let pScore = 0;
        const feedbackItem: any = { title: p.title, checks: {} };

        let correctACount = 0;
        pAns.a?.forEach((ans: string) => {
          if (p.questions.a.correct.includes(ans)) correctACount++;
        });
        pScore += correctACouncer = correctACount;
        feedbackItem.checks.a = { student: pAns.a, correct: p.questions.a.correct, earned: correctACount };

        let correctBCount = 0;
        p.questions.b.correct.forEach((corrWord: string, idx: number) => {
          const studentWord = (pAns.b?.[idx] || '').trim().toLowerCase();
          if (studentWord === corrWord.toLowerCase()) correctBCount++;
        });
        pScore += correctBCount;
        feedbackItem.checks.b = { student: pAns.b, correct: p.questions.b.correct, earned: correctBCount };

        let correctCCount = 0;
        const correctMap: Record<string, string> = p.questions.c.correct;
        Object.keys(correctMap).forEach(gap => {
          if (pAns.c?.[gap] === correctMap[gap]) correctCCount++;
        });
        pScore += correctCCount;
        feedbackItem.checks.c = { student: pAns.c, correct: correctMap, earned: correctCCount };

        let correctDCount = 0;
        if (pAns.d === p.questions.d.correct) correctDCount = 1;
        pScore += correctDCount;
        feedbackItem.checks.d = { student: pAns.d, correct: p.questions.d.correct, earned: correctDCount };

        totalScore += pScore;
        detailedFeedback[p.id] = feedbackItem;
      });

      const percentage = Math.round((totalScore / maxPossibleScore) * 100);

      const { error } = await supabase.from('submissions').insert([
        {
          student_id: studentId,
          chosen_text_type: `Paper 2 Reading Exam (${totalScore}/${maxPossibleScore} - %${percentage})`,
          content: JSON.stringify(detailedFeedback),
          ai_score_a: totalScore,
          ai_score_b: maxPossibleScore,
          ai_score_c: percentage,
          teacher_feedback: `Exam completed. Score: ${totalScore} / ${maxPossibleScore} (${percentage}%)`,
          is_read_by_student: false
        }
      ]);

      if (error) throw error;

      alert(`Exam submitted successfully! Your Score: ${totalScore} / ${maxPossibleScore} (${percentage}%)`);
      router.push('/student/portfolio');
    } catch (err: any) {
      alert('Error submitting exam: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const currentAns = answers[currentPassage.id] || { a: [], b: {}, c: {}, d: '' };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      <header className="border-b bg-white sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => router.push('/student')} 
              className="px-3 py-1.5 rounded-lg border text-xs bg-slate-50 hover:bg-slate-100 font-bold cursor-pointer"
            >
              ← Back to Portal
            </button>
            <span className="font-bold text-slate-900">IBDP English B — Paper 2 (Reading Comprehension)</span>
          </div>
          <span className="text-xs px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
            Passage {currentIndex + 1} of {passages.length}
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 bg-white p-8 rounded-3xl border-2 border-slate-200 shadow-sm space-y-6">
            <div className="border-b pb-4 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono uppercase px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md font-bold">
                  {currentPassage.theme}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-2">{currentPassage.title}</h2>
              </div>
              <span className="text-xs font-mono font-bold text-slate-400">#0{currentPassage.id}</span>
            </div>
            
            <div className="font-serif text-sm leading-relaxed text-slate-800 space-y-4 whitespace-pre-line bg-slate-50 p-6 rounded-2xl border border-slate-100">
              {currentPassage.text}
            </div>
          </div>

          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold bg-slate-900 text-white px-2.5 py-1 rounded-lg">(a) True Statements</span>
                <span className="text-xs font-semibold text-slate-500">Choose 4 [4 marks]</span>
              </div>
              <p className="text-xs font-medium text-slate-700">{currentPassage.questions.a.prompt}</p>
              
              <div className="space-y-2">
                {currentPassage.questions.a.options.map(opt => (
                  <label key={opt.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
                    <input 
                      type="checkbox" 
                      checked={currentAns.a.includes(opt.id)}
                      onChange={() => handleAnswerChange('a', opt.id)}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                    />
                    <span><b>{opt.id}.</b> {opt.text}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold bg-slate-900 text-white px-2.5 py-1 rounded-lg">(b) Sentence Completion</span>
                <span className="text-xs font-semibold text-slate-500">[3 marks]</span>
              </div>
              <p className="text-xs font-medium text-slate-700">{currentPassage.questions.b.prompt}</p>

              <div className="space-y-3">
                {currentPassage.questions.b.items.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">{idx + 1}. {item}</label>
                    <input 
                      type="text" 
                      value={currentAns.b[idx] || ''}
                      onChange={e => handleAnswerChange('b', e.target.value, idx)}
                      placeholder="Type exact word from text..." 
                      className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 focus:bg-white transition-colors" 
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold bg-slate-900 text-white px-2.5 py-1 rounded-lg">(c) Headings Matching</span>
                <span className="text-xs font-semibold text-slate-500">[4 marks]</span>
              </div>
              <p className="text-xs font-medium text-slate-700">{currentPassage.questions.c.prompt}</p>

              <div className="p-3 bg-slate-50 rounded-xl border text-[11px] space-y-1 font-mono text-slate-600">
                {currentPassage.questions.c.headings.map((h, i) => (
                  <div key={i}>{h}</div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {['1', '2', '3', '4'].map(gapNum => (
                  <div key={gapNum} className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Gap [ – {gapNum} – ]</label>
                    <select 
                      value={currentAns.c[gapNum] || ''}
                      onChange={e => handleAnswerChange('c', e.target.value, gapNum)}
                      className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50"
                    >
                      <option value="">Select heading...</option>
                      {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(letter => (
                        <option key={letter} value={letter}>Heading {letter}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold bg-slate-900 text-white px-2.5 py-1 rounded-lg">(d) Conclusion</span>
                <span className="text-xs font-semibold text-slate-500">[1 mark]</span>
              </div>
              <p className="text-xs font-medium text-slate-700">{currentPassage.questions.d.prompt}</p>

              <div className="space-y-2">
                {currentPassage.questions.d.options.map((opt, i) => (
                  <label key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
                    <input 
                      type="radio" 
                      name={`q_d_${currentPassage.id}`}
                      checked={currentAns.d === opt[0]}
                      onChange={() => handleAnswerChange('d', opt[0])}
                      className="text-indigo-600 focus:ring-indigo-500" 
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                {currentIndex > 0 && (
                  <button 
                    onClick={handlePrev}
                    className="w-1/3 py-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-2xl shadow-sm transition-all cursor-pointer text-xs tracking-wider uppercase"
                  >
                    ← Prev Passage
                  </button>
                )}
                
                {currentIndex < passages.length - 1 ? (
                  <button 
                    onClick={handleNext}
                    className={`${currentIndex > 0 ? 'w-2/3' : 'w-full'} py-4 bg-indigo-900 hover:bg-indigo-800 text-white font-bold rounded-2xl shadow-lg transition-all cursor-pointer text-xs tracking-wider uppercase`}
                  >
                    Next Passage ➔
                  </button>
                ) : (
                  <button 
                    onClick={handleSubmitExam}
                    disabled={submitting}
                    className={`${currentIndex > 0 ? 'w-2/3' : 'w-full'} py-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-lg transition-all cursor-pointer text-xs tracking-wider uppercase disabled:opacity-50`}
                  >
                    {submitting ? 'Submitting...' : 'Submit'}
                  </button>
                )}
              </div>

              {currentIndex < passages.length - 1 && (
                <button 
                  onClick={handleSubmitExam}
                  disabled={submitting}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-md transition-all cursor-pointer text-xs tracking-wider uppercase disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}