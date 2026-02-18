import { useMemo, useState } from "react";
import { useGetIdentity, useList } from "@refinedev/core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { Checkbox } from "@crm/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@crm/components/ui/select";
import { Download, FileText, Building2, Briefcase, Loader2, Upload } from "lucide-react";
import { Contact, Company, Deal, Tag } from "@crm/types";
import { useNotification } from "@refinedev/core";
import { bulkImportManager, type FieldMapping } from "@crm/lib/bulk-operations";

export const DataExport = () => {
  const { open } = useNotification();
  const { data: user } = useGetIdentity();
  const [exportingContacts, setExportingContacts] = useState(false);
  const [exportingCompanies, setExportingCompanies] = useState(false);
  const [exportingDeals, setExportingDeals] = useState(false);
  const [importEntity, setImportEntity] = useState<"contacts" | "companies" | "deals">("contacts");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importSummary, setImportSummary] = useState<
    | { success: number; failed: number; duplicates: number; errors: string[] }
    | null
  >(null);

  const { query: contactsQuery } = useList<Contact>({
    resource: "contacts",
    pagination: { mode: "off" },
  });

  const { query: companiesQuery } = useList<Company>({
    resource: "companies",
    pagination: { mode: "off" },
  });

  const { query: dealsQuery } = useList<Deal>({
    resource: "deals",
    pagination: { mode: "off" },
  });

  const { query: tagsQuery } = useList<Tag>({
    resource: "tags",
    pagination: { mode: "off" },
  });

  const convertToCSV = (data: any[], headers: string[]): string => {
    const csvRows = [];

    // Add header row
    csvRows.push(headers.join(","));

    // Add data rows
    for (const row of data) {
      const values = headers.map((header) => {
        const value = row[header];

        // Handle values that might contain commas or quotes
        if (value === null || value === undefined) {
          return "";
        }

        const stringValue = String(value);

        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
      });

      csvRows.push(values.join(","));
    }

    return csvRows.join("\n");
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportContacts = async () => {
    setExportingContacts(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate processing

      const contacts = contactsQuery.data?.data || [];
      const tags = tagsQuery.data?.data || [];

      // Prepare data with tag names instead of IDs
      const exportData = contacts.map((contact: Contact) => {
        const tagNames =
          contact.tagIds
            ?.map((tagId: string) => tags.find((t: Tag) => t.id === tagId)?.name)
            .filter(Boolean)
            .join("; ") || "";

        return {
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          companyId: contact.companyId,
          tags: tagNames,
          dealValue: contact.dealValue,
          status: contact.status,
        };
      });

      const headers = ["name", "email", "phone", "companyId", "tags", "dealValue", "status"];
      const csv = convertToCSV(exportData, headers);
      const timestamp = new Date().toISOString().split("T")[0];

      downloadCSV(csv, `contacts_export_${timestamp}.csv`);

      open?.({
        type: "success",
        message: "Contacts exported successfully",
        description: `${contacts.length} contacts exported to CSV`,
      });
    } catch (error) {
      open?.({
        type: "error",
        message: "Export failed",
        description: "There was an error exporting contacts",
      });
    } finally {
      setExportingContacts(false);
    }
  };

  const handleExportCompanies = async () => {
    setExportingCompanies(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate processing

      const companies = companiesQuery.data?.data || [];

      const exportData = companies.map((company: Company) => ({
        name: company.name,
        industry: company.industry,
        website: company.website,
        notes: company.notes,
      }));

      const headers = ["name", "industry", "website", "notes"];
      const csv = convertToCSV(exportData, headers);
      const timestamp = new Date().toISOString().split("T")[0];

      downloadCSV(csv, `companies_export_${timestamp}.csv`);

      open?.({
        type: "success",
        message: "Companies exported successfully",
        description: `${companies.length} companies exported to CSV`,
      });
    } catch (error) {
      open?.({
        type: "error",
        message: "Export failed",
        description: "There was an error exporting companies",
      });
    } finally {
      setExportingCompanies(false);
    }
  };

  const handleExportDeals = async () => {
    setExportingDeals(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate processing

      const deals = dealsQuery.data?.data || [];
      const tags = tagsQuery.data?.data || [];

      // Prepare data with tag names instead of IDs
      const exportData = deals.map((deal: Deal) => {
        const tagNames =
          deal.tagIds
            ?.map((tagId: string) => tags.find((t: Tag) => t.id === tagId)?.name)
            .filter(Boolean)
            .join("; ") || "";

        return {
          title: deal.title,
          contactId: deal.contactId,
          companyId: deal.companyId,
          value: deal.value,
          status: deal.status,
          tags: tagNames,
          createdAt: deal.createdAt,
        };
      });

      const headers = ["title", "contactId", "companyId", "value", "status", "tags", "createdAt"];
      const csv = convertToCSV(exportData, headers);
      const timestamp = new Date().toISOString().split("T")[0];

      downloadCSV(csv, `deals_export_${timestamp}.csv`);

      open?.({
        type: "success",
        message: "Deals exported successfully",
        description: `${deals.length} deals exported to CSV`,
      });
    } catch (error) {
      open?.({
        type: "error",
        message: "Export failed",
        description: "There was an error exporting deals",
      });
    } finally {
      setExportingDeals(false);
    }
  };

  const exportOptions = [
    {
      id: "contacts",
      title: "Export Contacts",
      description:
        "Download all contacts with their details including name, email, phone, company, tags, deal value, and status",
      icon: <FileText className="w-8 h-8" />,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      count: contactsQuery.data?.data?.length || 0,
      handler: handleExportContacts,
      loading: exportingContacts,
    },
    {
      id: "companies",
      title: "Export Companies",
      description: "Download all companies with their details including name, industry, website, and notes",
      icon: <Building2 className="w-8 h-8" />,
      color: "text-green-600",
      bgColor: "bg-green-50",
      count: companiesQuery.data?.data?.length || 0,
      handler: handleExportCompanies,
      loading: exportingCompanies,
    },
    {
      id: "deals",
      title: "Export Deals",
      description:
        "Download all deals with their details including title, contact, company, value, status, tags, and creation date",
      icon: <Briefcase className="w-8 h-8" />,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      count: dealsQuery.data?.data?.length || 0,
      handler: handleExportDeals,
      loading: exportingDeals,
    },
  ];

  const importConfigs = useMemo<
    Record<"contacts" | "companies" | "deals", { headers: string[]; mappings: FieldMapping[] }>
  >(() => {
    return {
      contacts: {
        headers: ["name", "email", "phone", "company_id", "deal_value", "status"],
        mappings: [
          { csvColumn: "name", entityField: "name", isRequired: true },
          { csvColumn: "email", entityField: "email", isRequired: true },
          { csvColumn: "phone", entityField: "phone" },
          { csvColumn: "company_id", entityField: "company_id" },
          { csvColumn: "deal_value", entityField: "deal_value", dataType: "number" },
          { csvColumn: "status", entityField: "status" },
        ],
      },
      companies: {
        headers: ["name", "industry", "website", "notes"],
        mappings: [
          { csvColumn: "name", entityField: "name", isRequired: true },
          { csvColumn: "industry", entityField: "industry" },
          { csvColumn: "website", entityField: "website" },
          { csvColumn: "notes", entityField: "notes" },
        ],
      },
      deals: {
        headers: ["title", "contact_id", "company_id", "value", "status"],
        mappings: [
          { csvColumn: "title", entityField: "title", isRequired: true },
          { csvColumn: "contact_id", entityField: "contact_id" },
          { csvColumn: "company_id", entityField: "company_id" },
          { csvColumn: "value", entityField: "value", dataType: "number" },
          { csvColumn: "status", entityField: "status" },
        ],
      },
    };
  }, []);

  const downloadTemplate = () => {
    const config = importConfigs[importEntity];
    const csv = `${config.headers.join(",")}\n`;
    downloadCSV(csv, `${importEntity}_template.csv`);
  };

  const parseCsvToRecords = (csvContent: string) => {
    const rows = bulkImportManager.parseCSV(csvContent);
    if (rows.length === 0) return { headers: [], records: [] };
    const [headersRow, ...dataRows] = rows;
    const headers = headersRow.map((header: string) => header.trim());
    const records = dataRows.map((row: any[]) => {
      const record: Record<string, any> = {};
      headers.forEach((header, index) => {
        record[header] = row[index];
      });
      return record;
    });
    return { headers, records };
  };

  const handleImport = async () => {
    if (!importFile || !user?.id) return;

    setImportSummary(null);
    setImporting(true);

    try {
      const content = await importFile.text();
      const { headers, records } = parseCsvToRecords(content);
      const config = importConfigs[importEntity];

      const missingHeaders = config.headers.filter((header) => !headers.includes(header));
      if (missingHeaders.length > 0) {
        open?.({
          type: "error",
          message: "Missing required columns",
          description: `CSV is missing: ${missingHeaders.join(", ")}`,
        });
        setImporting(false);
        return;
      }

      const validation = bulkImportManager.validateData(records, config.mappings, importEntity);
      if (!validation.valid) {
        const errors = validation.errors.slice(0, 5).map((error) =>
          `Row ${error.row}: ${error.field} ${error.reason}`
        );
        setImportSummary({ success: 0, failed: validation.errors.length, duplicates: 0, errors });
        open?.({
          type: "error",
          message: "Validation failed",
          description: "Fix CSV errors and try again.",
        });
        setImporting(false);
        return;
      }

      const jobEntityType =
        importEntity === "contacts" ? "contact" : importEntity === "companies" ? "company" : "deal";

      const job = await bulkImportManager.createImportJob(
        user.id,
        importFile.name,
        jobEntityType,
        records.length,
      );

      const result = await bulkImportManager.importRecords(
        job.id,
        records,
        importEntity,
        config.mappings,
        user.id,
        skipDuplicates,
        { user_id: user.id },
      );

      setImportSummary({
        success: result.success,
        failed: result.failed,
        duplicates: result.duplicates,
        errors: result.errors.map((error) => `Row ${error.row}: ${error.field} ${error.reason}`),
      });

      open?.({
        type: "success",
        message: "Import completed",
        description: `${result.success} records imported. ${result.failed} failed.`,
      });
    } catch (error) {
      open?.({
        type: "error",
        message: "Import failed",
        description: "There was an error importing your CSV file.",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Data Import & Export</h2>
        <p className="text-muted-foreground mt-2">Import CSV files or export your CRM data for backup and analysis</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Bulk Import
          </CardTitle>
          <CardDescription>Import CSV data into your CRM with validation and duplicate checks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Entity Type</label>
              <Select value={importEntity} onValueChange={(value) => setImportEntity(value as "contacts" | "companies" | "deals")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contacts">Contacts</SelectItem>
                  <SelectItem value="companies">Companies</SelectItem>
                  <SelectItem value="deals">Deals</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">CSV File</label>
              <input
                type="file"
                accept=".csv"
                onChange={(event) => setImportFile(event.target.files?.[0] || null)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={downloadTemplate} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox checked={skipDuplicates} onCheckedChange={(checked) => setSkipDuplicates(Boolean(checked))} />
            <span className="text-sm text-muted-foreground">Skip duplicates based on required fields</span>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleImport} disabled={!importFile || importing}>
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import CSV
                </>
              )}
            </Button>
          </div>

          {importSummary && (
            <div className="rounded-md border border-border bg-muted/40 p-4 text-sm">
              <p className="font-medium">Import Summary</p>
              <p className="text-muted-foreground">Success: {importSummary.success}</p>
              <p className="text-muted-foreground">Failed: {importSummary.failed}</p>
              <p className="text-muted-foreground">Duplicates: {importSummary.duplicates}</p>
              {importSummary.errors.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                  {importSummary.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exportOptions.map((option) => (
          <Card key={option.id} className="relative overflow-hidden">
            <CardHeader>
              <div className={`w-16 h-16 rounded-lg ${option.bgColor} flex items-center justify-center mb-4`}>
                <div className={option.color}>{option.icon}</div>
              </div>
              <CardTitle className="text-lg">{option.title}</CardTitle>
              <CardDescription className="text-sm">{option.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total records:</span>
                <span className="font-semibold">{option.count}</span>
              </div>
              <Button
                onClick={option.handler}
                disabled={option.loading || option.count === 0}
                className="w-full"
                variant="outline">
                {option.loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export to CSV
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Information</CardTitle>
          <CardDescription>Important notes about data export</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p className="flex items-start gap-2">
              <span className="text-muted-foreground">•</span>
              <span>CSV files are compatible with Excel, Google Sheets, and other spreadsheet applications</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-muted-foreground">•</span>
              <span>Exported files include all current data at the time of export</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-muted-foreground">•</span>
              <span>Tag IDs are converted to tag names for easier readability</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-muted-foreground">•</span>
              <span>Company and contact IDs are preserved for reference purposes</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-muted-foreground">•</span>
              <span>Files are named with export date for easy identification</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
