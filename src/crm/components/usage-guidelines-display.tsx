import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@crm/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";
import type { UsageGuideline } from "@crm/types";

interface UsageGuidelinesDisplayProps {
  guideline: UsageGuideline;
}

export function UsageGuidelinesDisplay({ guideline }: UsageGuidelinesDisplayProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Guidelines</CardTitle>
        <CardDescription>{guideline.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {guideline.dosList.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Do's
            </h4>
            <ul className="space-y-2">
              {guideline.dosList.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {guideline.dontsList.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-red-700">
              <XCircle className="h-4 w-4" />
              Don'ts
            </h4>
            <ul className="space-y-2">
              {guideline.dontsList.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
