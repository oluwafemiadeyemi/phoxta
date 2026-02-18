import { useShow, useOne, useUpdate } from "@refinedev/core";
import { useCurrency } from "@crm/hooks/use-currency";
import { useNavigate } from "react-router";
import { ShowView, ShowViewHeader } from "@crm/components/refine-ui/views/show-view";
import { LoadingOverlay } from "@crm/components/refine-ui/layout/loading-overlay";
import { EditButton } from "@crm/components/refine-ui/buttons/edit";
import { Badge } from "@crm/components/ui/badge";
import { Button } from "@crm/components/ui/button";
import { Card, CardContent } from "@crm/components/ui/card";
import { Separator } from "@crm/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@crm/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@crm/components/ui/alert-dialog";
import { Building2, Mail, Phone, Download, Send, CheckCircle, XCircle, Minus, Plus, RotateCcw } from "lucide-react";
import type { Quote, Contact, Company, CompanySettings } from "@crm/types";
import { useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { logEngagementEvent } from "@crm/lib/engagement";

const statusColors = {
  Draft: "bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-300",
  Sent: "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-300",
  Accepted: "bg-green-100 text-green-800 hover:bg-green-100 border-green-300",
  Rejected: "bg-red-100 text-red-800 hover:bg-red-100 border-red-300",
  Expired: "bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-300",
};

function QuotesShowPage() {
  const navigate = useNavigate();
  const { format, currencyCode } = useCurrency();
  const { query } = useShow<Quote>();
  const quote = query.data?.data;
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const lastTapRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchMovedRef = useRef(false);
  const [fitScale, setFitScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);

  const PAPER_WIDTH_PX = 820;
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 2.5;

  const { mutate: updateQuote } = useUpdate();

  const { result: companySettingsResult } = useOne<CompanySettings>({
    resource: "companySettings",
    id: "00000000-0000-0000-0000-000000000001",
  });
  const companySettings = companySettingsResult;
  const localSettings = typeof window !== "undefined"
    ? (() => {
        try {
          const raw = window.localStorage.getItem("companySettings");
          return raw ? (JSON.parse(raw) as { companyName?: string; logo?: string | null; termsConditions?: string | null; paymentDetails?: string | null }) : {};
        } catch {
          return {};
        }
      })()
    : {};
  const companyName = companySettings?.companyName || localSettings.companyName || "Phoxta CRM";
  const companyLogo =
    companySettings?.logo ||
    (companySettings as any)?.companyLogo ||
    localSettings.logo ||
    null;
  const termsConditions =
    companySettings?.termsConditions ||
    (companySettings as any)?.terms_conditions ||
    localSettings.termsConditions ||
    null;
  const paymentDetails =
    companySettings?.paymentDetails ||
    (companySettings as any)?.payment_details ||
    localSettings.paymentDetails ||
    null;

  // Fetch contact details
  const { result: contactData, query: contactQuery } = useOne<Contact>({
    resource: "contacts",
    id: quote?.contactId ?? "",
    queryOptions: {
      enabled: !!quote?.contactId,
    },
  });
  const contact = contactData;

  // Fetch company details
  const { result: companyData, query: companyQuery } = useOne<Company>({
    resource: "companies",
    id: quote?.companyId ?? "",
    queryOptions: {
      enabled: !!quote?.companyId,
    },
  });
  const company = companyData;

  const isLoading = query.isLoading || contactQuery.isLoading || companyQuery.isLoading;

  useEffect(() => {
    if (!quote?.id) return;
    logEngagementEvent("quote_viewed", { id: quote.id, quoteNumber: quote.quoteNumber });
    // only when quote changes
  }, [quote?.id]);

  useEffect(() => {
    const viewportEl = viewportRef.current;
    if (!viewportEl || typeof ResizeObserver === "undefined") return;

    const updateFitScale = () => {
      const availableWidth = Math.max(0, viewportEl.clientWidth - 16);
      const nextFitScale = Math.min(1, availableWidth / PAPER_WIDTH_PX);
      setFitScale(Number.isFinite(nextFitScale) && nextFitScale > 0 ? nextFitScale : 1);
    };

    updateFitScale();
    const observer = new ResizeObserver(updateFitScale);
    observer.observe(viewportEl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onBeforePrint = () => setIsPrinting(true);
    const onAfterPrint = () => setIsPrinting(false);
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, []);

  // Calculate grand total if missing from database
  const calculateGrandTotal = () => {
    if (!quote) return 0;

    // If grandTotal exists and is valid, use it
    if (quote.grandTotal !== undefined && quote.grandTotal !== null && Number.isFinite(quote.grandTotal)) {
      return quote.grandTotal;
    }

    // Otherwise calculate it
    const lineSubtotal = Array.isArray(quote.lineItems)
      ? quote.lineItems.reduce((sum, item) => sum + (Number(item.total ?? 0) || 0), 0)
      : 0;
    const subtotal = Number(quote.subtotal ?? lineSubtotal) || lineSubtotal;
    const taxRate = Number(quote.taxRate ?? 0) || 0;
    const discount = Number(quote.discount ?? 0) || 0;
    const taxAmount = (subtotal * taxRate) / 100;
    return Math.max(0, subtotal + taxAmount - discount);
  };

  const grandTotal = calculateGrandTotal();
  const fallbackSubtotal = quote
    ? Number(quote.subtotal ?? quote.lineItems?.reduce((sum, item) => sum + (Number(item.total ?? 0) || 0), 0)) || 0
    : 0;
  const taxAmount = quote ? (fallbackSubtotal * (Number(quote.taxRate ?? 0) || 0)) / 100 : 0;

  const handleStatusUpdate = (newStatus: Quote["status"]) => {
    if (!quote) return;

    const statusHistoryEntry = {
      id: `status-${Date.now()}`,
      status: newStatus,
      timestamp: new Date().toISOString(),
    };

    updateQuote({
      resource: "quotes",
      id: quote.id,
      values: {
        status: newStatus,
        statusHistory: [...quote.statusHistory, statusHistoryEntry],
      },
    });
  };

  const handleDownloadPDF = async () => {
    if (!quote || !contact || !company) return;

    setIsGeneratingPDF(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;

      // Header Section
      doc.setFontSize(24);
      doc.setTextColor(59, 130, 246); // Primary blue color
      doc.text(companyName, 20, yPosition);

      // Quote Number and Status
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text("QUOTE", pageWidth - 20, yPosition, { align: "right" });

      doc.setFontSize(12);
      doc.setTextColor(59, 130, 246);
      doc.text(quote.quoteNumber, pageWidth - 20, yPosition + 8, { align: "right" });

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Status: ${quote.status}`, pageWidth - 20, yPosition + 14, { align: "right" });

      yPosition += 30;

      // Line separator
      doc.setDrawColor(220, 220, 220);
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 10;

      // Bill To and Quote Details
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("BILL TO", 20, yPosition);
      doc.text("QUOTE DETAILS", pageWidth / 2 + 10, yPosition);

      yPosition += 6;

      // Company and Contact Info
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(company?.name, 20, yPosition);

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(company?.industry, 20, yPosition + 5);
      if (company?.website) {
        doc.text(company?.website, 20, yPosition + 10);
      }

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(contact?.name, 20, yPosition + 18);

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(contact?.email, 20, yPosition + 23);
      if (contact?.phone) {
        doc.text(contact?.phone, 20, yPosition + 28);
      }

      // Quote Details
      const quoteDate = new Date(quote.quoteDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const expiryDate = new Date(quote.expiryDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("Quote Date:", pageWidth / 2 + 10, yPosition);
      doc.setTextColor(0, 0, 0);
      doc.text(quoteDate, pageWidth / 2 + 40, yPosition);

      doc.setTextColor(100, 100, 100);
      doc.text("Expiry Date:", pageWidth / 2 + 10, yPosition + 5);
      doc.setTextColor(0, 0, 0);
      doc.text(expiryDate, pageWidth / 2 + 40, yPosition + 5);

      if (quote.dealId) {
        doc.setTextColor(100, 100, 100);
        doc.text("Deal ID:", pageWidth / 2 + 10, yPosition + 10);
        doc.setTextColor(0, 0, 0);
        doc.text(quote.dealId, pageWidth / 2 + 40, yPosition + 10);
      }

      yPosition += 40;

      // Line Items Table
      const tableData = quote.lineItems.map((item) => [
        item.product,
        item.description,
        item.quantity.toString(),
        format(item.price),
        format(item.total),
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [["Product/Service", "Description", "Qty", "Price", "Total"]],
        body: tableData,
        theme: "striped",
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: "bold",
        },
        bodyStyles: {
          fontSize: 9,
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 60 },
          2: { cellWidth: 15, halign: "right" },
          3: { cellWidth: 25, halign: "right" },
          4: { cellWidth: 25, halign: "right" },
        },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // Totals
      const totalsX = pageWidth - 70;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);

      doc.text("Subtotal:", totalsX, yPosition);
      doc.text(
        format(quote.subtotal),
        pageWidth - 20,
        yPosition,
        { align: "right" },
      );

      yPosition += 6;
      doc.text(`Tax (${quote.taxRate}%):`, totalsX, yPosition);
      doc.text(
        format((quote.subtotal * quote.taxRate) / 100),
        pageWidth - 20,
        yPosition,
        { align: "right" },
      );

      if (quote.discount > 0) {
        yPosition += 6;
        doc.text("Discount:", totalsX, yPosition);
        doc.setTextColor(220, 38, 38);
        doc.text(
          "-" + format(quote.discount),
          pageWidth - 20,
          yPosition,
          { align: "right" },
        );
        doc.setTextColor(0, 0, 0);
      }

      yPosition += 8;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Grand Total:", totalsX, yPosition);
      doc.setTextColor(59, 130, 246);
      doc.text(
        format(grandTotal),
        pageWidth - 20,
        yPosition,
        { align: "right" },
      );

      yPosition += 15;
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");

      // Terms & Conditions
      if (yPosition > 220) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("TERMS & CONDITIONS", 20, yPosition);
      yPosition += 6;

      doc.setFontSize(8);
      const termsText =
        termsConditions ||
        `1. Payment is due within 30 days of the quote date.\n2. This quote is valid until the expiry date mentioned above.\n3. All prices are in ${currencyCode} and exclude applicable taxes unless otherwise stated.\n4. Services will commence upon receipt of signed acceptance and initial payment.\n5. Any changes to the scope of work may result in additional charges.`;

      termsText.split("\n").forEach((term: string) => {
        doc.text(term, 20, yPosition);
        yPosition += 5;
      });

      yPosition += 5;

      // Payment Details
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("PAYMENT DETAILS", 20, yPosition);
      yPosition += 6;

      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      const paymentText =
        paymentDetails ||
        `Bank Name: Business Bank\nAccount Name: ${companyName}\nAccount Number: 1234567890\nRouting Number: 987654321`;
      paymentText.split("\n").forEach((line: string) => {
        doc.text(line, 20, yPosition);
        yPosition += 5;
      });

      // Notes
      if (quote.notes) {
        yPosition += 10;
        if (yPosition > 240) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("NOTES", 20, yPosition);
        yPosition += 6;

        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        const notesLines = doc.splitTextToSize(quote.notes, pageWidth - 40);
        doc.text(notesLines, 20, yPosition);
      }

      // Footer
      const footerY = doc.internal.pageSize.getHeight() - 20;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        "Thank you for your business! If you have any questions, please contact us at support@startupcrm.com",
        pageWidth / 2,
        footerY,
        { align: "center" },
      );

      // Generate filename
      const filename = `Quote-${quote.quoteNumber}-${company.name.replace(/\s+/g, "-")}.pdf`;

      // Save the PDF
      doc.save(filename);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <ShowView>
      <ShowViewHeader title="Quote Preview" />

      {/* Custom Action Buttons */}
      {quote && quote.status !== "Accepted" && quote.status !== "Rejected" && (
        <div className="flex gap-2 -mt-2 print:hidden">
          {quote.status === "Draft" && (
            <Button variant="outline" onClick={() => handleStatusUpdate("Sent")}>
              <Send className="h-4 w-4 mr-2" />
              Send Quote
            </Button>
          )}
          <Button variant="outline" onClick={handleDownloadPDF} disabled={isGeneratingPDF}>
            <Download className="h-4 w-4 mr-2" />
            {isGeneratingPDF ? "Generating PDF..." : "Download PDF"}
          </Button>
        </div>
      )}

      <LoadingOverlay loading={isLoading}>
        {quote && (
          <div className="max-w-5xl mx-auto px-2 sm:px-0">
            {/* Action Buttons for Status Updates - Only show if not already in final state */}
            {quote.status !== "Accepted" && quote.status !== "Rejected" && (
              <div className="flex gap-2 mb-6 print:hidden">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-green-600 border-green-300 hover:bg-green-50">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Accepted
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Accept Quote</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to mark this quote as accepted? This action will update the quote status.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleStatusUpdate("Accepted")}>Accept Quote</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                      <XCircle className="h-4 w-4 mr-2" />
                      Mark as Rejected
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reject Quote</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to mark this quote as rejected? This action will update the quote status.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleStatusUpdate("Rejected")}>Reject Quote</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            <div className="sm:hidden mb-3 text-xs text-muted-foreground print:hidden">
              Tip: double-tap the document to zoom. Use +/- to zoom in or out.
            </div>

            {/* Printable Document */}
            <div className="relative">
              <div
                ref={viewportRef}
                className="relative overflow-auto rounded-lg border bg-muted/20 p-2 sm:p-4 print:overflow-visible print:border-none print:bg-transparent print:p-0"
              >
                <div
                  className="mx-auto"
                  style={{
                    width: (isPrinting ? 1 : fitScale * zoom) * PAPER_WIDTH_PX,
                  }}
                >
                  <div
                    className="origin-top-left print:[transform:none]"
                    style={{
                      width: PAPER_WIDTH_PX,
                      transform: `scale(${isPrinting ? 1 : fitScale * zoom})`,
                      transformOrigin: "top left",
                    }}
                    onDoubleClick={() => {
                      setZoom((currentZoom) => (currentZoom === 1 ? 1.75 : 1));
                    }}
                    onTouchStart={(e) => {
                      const touch = e.touches?.[0];
                      if (!touch) return;
                      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
                      touchMovedRef.current = false;
                    }}
                    onTouchMove={(e) => {
                      const touch = e.touches?.[0];
                      const start = touchStartRef.current;
                      if (!touch || !start) return;
                      const dx = Math.abs(touch.clientX - start.x);
                      const dy = Math.abs(touch.clientY - start.y);
                      if (dx > 10 || dy > 10) touchMovedRef.current = true;
                    }}
                    onTouchEnd={() => {
                      if (touchMovedRef.current) return;

                      const now = Date.now();
                      const delta = now - lastTapRef.current;
                      lastTapRef.current = now;

                      if (delta > 0 && delta < 300) {
                        // Double-tap toggles zoom in/out
                        setZoom((currentZoom) => (currentZoom === 1 ? 1.75 : 1));
                        return;
                      }

                      // Single tap zooms in (to help editing/reading), but doesn't toggle back out.
                      setZoom((currentZoom) => (currentZoom === 1 ? 1.75 : currentZoom));
                    }}
                  >
                    <Card className="print:shadow-none print:border-none bg-background">
                      <CardContent className="p-4 sm:p-8 space-y-6 sm:space-y-8">
                        {/* Header Section */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                          <div className="flex flex-col items-start gap-2">
                            {companyLogo ? (
                              <img
                                src={companyLogo}
                                alt="Company logo"
                                className="h-14 w-24 rounded-md object-contain"
                              />
                            ) : null}
                            <h1 className="text-3xl font-bold text-primary">{companyName}</h1>
                          </div>
                  <div className="text-right">
                    <h2 className="text-2xl font-bold mb-2">QUOTE</h2>
                    <p className="text-lg font-semibold text-primary">{quote.quoteNumber}</p>
                    <Badge variant="outline" className={`${statusColors[quote.status]} mt-2`}>
                      {quote.status}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <div className="w-full max-w-sm rounded-lg border bg-muted/20 p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">
                        {format(quote.subtotal)}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax ({quote.taxRate}%)</span>
                      <span className="font-medium">
                        {format(taxAmount)}
                      </span>
                    </div>
                    {quote.discount > 0 && (
                      <div className="mt-2 flex justify-between text-sm">
                        <span className="text-muted-foreground">Discount</span>
                        <span className="font-medium text-red-600">
                          -{format(quote.discount)}
                        </span>
                      </div>
                    )}
                    <div className="mt-3 border-t pt-3 flex justify-between text-base font-semibold">
                      <span>Grand Total</span>
                      <span className="text-primary">
                        {format(grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Company and Contact Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">BILL TO</h3>
                    <div className="space-y-2">
                      <p className="font-semibold text-lg">{company?.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span>{company?.industry}</span>
                      </div>
                      {company?.website && <p className="text-sm text-muted-foreground">{company.website}</p>}
                      <Separator className="my-3" />
                      <p className="font-medium">{contact?.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{contact?.email}</span>
                      </div>
                      {contact?.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">QUOTE DETAILS</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Quote Date:</span>
                        <span className="text-sm font-medium">
                          {new Date(quote.quoteDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Expiry Date:</span>
                        <span className="text-sm font-medium">
                          {new Date(quote.expiryDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      {quote.dealId && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Deal ID:</span>
                          <span className="text-sm font-medium">{quote.dealId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Line Items Table */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-4">ITEMS</h3>
                  <div className="overflow-x-auto">
                    <div className="min-w-[640px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[40%]">Product/Service</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {quote.lineItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.product}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{item.description}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">
                                {format(item.price)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {format(item.total)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableFooter>
                          <TableRow>
                            <TableCell colSpan={4} className="text-right font-medium">
                              Subtotal
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {format(quote.subtotal)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell colSpan={4} className="text-right font-medium">
                              Tax ({quote.taxRate}%)
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {format(taxAmount)}
                            </TableCell>
                          </TableRow>
                          {quote.discount > 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-right font-medium">
                                Discount
                              </TableCell>
                              <TableCell className="text-right font-medium text-red-600">
                                -{format(quote.discount)}
                              </TableCell>
                            </TableRow>
                          )}
                          <TableRow>
                            <TableCell colSpan={4} className="text-right text-lg font-bold">
                              Grand Total
                            </TableCell>
                            <TableCell className="text-right text-lg font-bold text-primary">
                              {format(grandTotal)}
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Terms & Conditions */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">TERMS & CONDITIONS</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {(termsConditions ||
                      `1. Payment is due within 30 days of the quote date.\n2. This quote is valid until the expiry date mentioned above.\n3. All prices are in ${currencyCode} and exclude applicable taxes unless otherwise stated.\n4. Services will commence upon receipt of signed acceptance and initial payment.\n5. Any changes to the scope of work may result in additional charges.`)
                      .split("\n")
                      .map((line: string) => (
                        <p key={line}>{line}</p>
                      ))}
                  </div>
                </div>

                <Separator />

                {/* Payment Details */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">PAYMENT DETAILS</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {(paymentDetails ||
                      `Bank Name: Business Bank\nAccount Name: ${companyName}\nAccount Number: 1234567890\nRouting Number: 987654321`)
                      .split("\n")
                      .map((line: string) => (
                        <p key={line}>{line}</p>
                      ))}
                  </div>
                </div>

                {/* Notes Section */}
                {quote.notes && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3">NOTES</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
                    </div>
                  </>
                )}

                {/* Footer */}
                <div className="text-center pt-8 border-t">
                  <p className="text-xs text-muted-foreground">
                    Thank you for your business! If you have any questions, please contact us at support@startupcrm.com
                  </p>
                </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>

              <div className="print:hidden fixed bottom-4 right-4 z-40 flex items-center gap-1 rounded-full border bg-background/90 backdrop-blur px-2 py-2 shadow-sm">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setZoom((z) => Math.max(MIN_ZOOM, Math.round((z - 0.1) * 10) / 10))}
                  aria-label="Zoom out"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="min-w-[52px] text-center text-xs tabular-nums text-muted-foreground">
                  {Math.round((isPrinting ? 1 : fitScale * zoom) * 100)}%
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setZoom((z) => Math.min(MAX_ZOOM, Math.round((z + 0.1) * 10) / 10))}
                  aria-label="Zoom in"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setZoom(1)}
                  aria-label="Reset zoom"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </LoadingOverlay>
    </ShowView>
  );
}

export default QuotesShowPage;
