import { consultationSteps } from '../../lib/content/copy';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';

export default function ConsultationSteps() {
  return (
    <Accordion type="single" collapsible defaultValue="step-0">
      {consultationSteps.map((step, index) => (
        <AccordionItem key={step.title} value={`step-${index}`}>
          <AccordionTrigger>
            <span>
              <span className="step-number">0{index + 1}</span>
              {step.title}
            </span>
          </AccordionTrigger>
          <AccordionContent>{step.text}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
