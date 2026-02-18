import { supabaseClient } from "./supabase";
import mockData from "../mocks.json";
import { ensureTeamMemberProfile } from "@crm/lib/ensure-team-member";

interface SeedResult {
  success: boolean;
  message: string;
  error?: string;
}

interface IdMapping {
  [oldId: string]: string; // Maps mock IDs to Supabase UUIDs
}

/**
 * Check if the database needs seeding (is empty)
 */
export async function checkNeedsSeed(): Promise<boolean> {
  try {
    const { data: user } = await supabaseClient.auth.getUser();
    if (!user?.user) return false;

    // Check if user has any data
    const { data: companies, error } = await supabaseClient.from("companies").select("id").limit(1);

    if (error) {
      console.error("Error checking for seed:", error);
      return false;
    }

    return !companies || companies.length === 0;
  } catch (error) {
    console.error("Error in checkNeedsSeed:", error);
    return false;
  }
}

/**
 * Seed the database with sample data for the current user
 */
export async function seedDatabase(): Promise<SeedResult> {
  console.log("[SEED] Starting database seeding process...");

  try {
    // Validate mock data exists
    if (!mockData || typeof mockData !== "object") {
      console.error("[SEED] Mock data not loaded:", mockData);
      return {
        success: false,
        message: "Sample data file not found",
        error: "Mock data is not available. Please check if mocks.json exists.",
      };
    }

    console.log("[SEED] Mock data loaded successfully");
    console.log("[SEED] Available data:", {
      tags: mockData.tags?.length || 0,
      companies: mockData.companies?.length || 0,
      contacts: mockData.contacts?.length || 0,
      deals: mockData.deals?.length || 0,
      ecommerceCategories: (mockData as any).ecommerceCategories?.length || 0,
      ecommerceProducts: (mockData as any).ecommerceProducts?.length || 0,
      ecommerceStores: (mockData as any).ecommerceStores?.length || 0,
      ecommerceCustomers: (mockData as any).ecommerceCustomers?.length || 0,
      ecommerceCouriers: (mockData as any).ecommerceCouriers?.length || 0,
      ecommerceOrders: (mockData as any).ecommerceOrders?.length || 0,
      ecommerceReviews: (mockData as any).ecommerceReviews?.length || 0,
      staff: (mockData as any).staff?.length || 0,
      emailTemplates: (mockData as any).emailTemplates?.length || 0,
      emails: (mockData as any).emails?.length || 0,
    });

    const { data: userData, error: authError } = await supabaseClient.auth.getUser();
    if (authError) {
      console.error("[SEED] Auth error:", authError);
      return {
        success: false,
        message: "Authentication error",
        error: authError.message,
      };
    }

    if (!userData?.user) {
      return {
        success: false,
        message: "No authenticated user found",
        error: "Please log in to load sample data",
      };
    }

    const userId = userData.user.id;
    console.log("[SEED] Seeding data for user:", userId);

    // Ensure the current user has a real team_members profile (so tasks can be assigned)
    await ensureTeamMemberProfile(userData.user);

    // Resolve a valid team_members.id for the current user (FK target for tasks.assignee_id)
    let currentTeamMemberId: string | null = null;
    try {
      const { data: teamMember, error: teamMemberError } = await supabaseClient
        .from("team_members")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (teamMemberError) {
        console.warn("[SEED] Unable to resolve team member id:", teamMemberError);
      } else {
        currentTeamMemberId = teamMember?.id ?? null;
      }
    } catch (error) {
      console.warn("[SEED] Error fetching team member id:", error);
    }

    // ID mappings to convert mock IDs to Supabase UUIDs
    const tagIdMap: IdMapping = {};
    const companyIdMap: IdMapping = {};
    const contactIdMap: IdMapping = {};
    const dealIdMap: IdMapping = {};
    const projectIdMap: IdMapping = {};
    const teamIdMap: IdMapping = {};
    const taskIdMap: IdMapping = {};
    const quoteIdMap: IdMapping = {};

    // E-commerce ID mappings
    const ecCategoryIdMap: IdMapping = {};
    const ecProductIdMap: IdMapping = {};
    const ecStoreIdMap: IdMapping = {};
    const ecCustomerIdMap: IdMapping = {};
    const ecCourierIdMap: IdMapping = {};
    const ecOrderIdMap: IdMapping = {};

    // 1. Seed Tags
    console.log("[SEED] Seeding tags...");
    try {
      for (const tag of mockData.tags) {
        const { data, error } = await supabaseClient
          .from("tags")
          .insert({
            user_id: userId,
            name: tag.name,
            color: tag.color,
          })
          .select("id")
          .single();

        if (error) {
          console.error("[SEED] Error inserting tag:", tag.name, error);
          throw error;
        }
        if (data) tagIdMap[tag.id] = data.id;
      }
      console.log(`[SEED] ✓ Created ${Object.keys(tagIdMap).length} tags`);
    } catch (error) {
      console.error("[SEED] Failed at tags step:", error);
      throw new Error(`Failed to seed tags: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 2. Seed Companies
    console.log("[SEED] Seeding companies...");
    for (const company of mockData.companies) {
      const { data, error } = await supabaseClient
        .from("companies")
        .insert({
          user_id: userId,
          name: company.name,
          industry: company.industry,
          website: company.website,
          notes: company.notes,
        })
        .select("id")
        .single();

      if (error) { console.error("[SEED] Failed at COMPANIES:", error.message, error.code); throw error; }
      if (data) companyIdMap[company.id] = data.id;
    }
    console.log(`[SEED] ✓ Created ${Object.keys(companyIdMap).length} companies`);

    // 3. Seed Contacts
    console.log("[SEED] Seeding contacts...");
    for (const contact of mockData.contacts) {
      const { data, error } = await supabaseClient
        .from("contacts")
        .insert({
          user_id: userId,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          company_id: contact.companyId ? companyIdMap[contact.companyId] : null,
          deal_value: contact.dealValue,
          status: contact.status,
        })
        .select("id")
        .single();

      if (error) { console.error("[SEED] Failed at CONTACTS:", error.message, error.code); throw error; }
      if (data) {
        contactIdMap[contact.id] = data.id;

        // Insert contact tags
        if (contact.tagIds && contact.tagIds.length > 0) {
          const contactTags = contact.tagIds.map((tagId) => ({
            contact_id: data.id,
            tag_id: tagIdMap[tagId],
          }));

          await supabaseClient.from("contact_tags").insert(contactTags);
        }
      }
    }
    console.log(`[SEED] ✓ Created ${Object.keys(contactIdMap).length} contacts`);

    // 4. Seed Deals
    console.log("[SEED] Seeding deals...");
    for (const deal of mockData.deals) {
      const { data, error } = await supabaseClient
        .from("deals")
        .insert({
          user_id: userId,
          contact_id: deal.contactId ? contactIdMap[deal.contactId] : null,
          company_id: deal.companyId ? companyIdMap[deal.companyId] : null,
          title: deal.title,
          value: deal.value,
          status: deal.status,
          created_at: deal.createdAt,
        })
        .select("id")
        .single();

      if (error) { console.error("[SEED] Failed at DEALS:", error.message, error.code); throw error; }
      if (data) {
        dealIdMap[deal.id] = data.id;

        // Insert deal tags
        if (deal.tagIds && deal.tagIds.length > 0) {
          const dealTags = deal.tagIds.map((tagId) => ({
            deal_id: data.id,
            tag_id: tagIdMap[tagId],
          }));

          await supabaseClient.from("deal_tags").insert(dealTags);
        }
      }
    }
    console.log(`[SEED] ✓ Created ${Object.keys(dealIdMap).length} deals`);

    // 5. Seed Projects
    console.log("[SEED] Seeding projects...");
    for (const project of mockData.projects) {
      const { data, error } = await supabaseClient
        .from("projects")
        .insert({
          user_id: userId,
          name: project.name,
          description: project.description,
          color: project.color,
          status: "active",
        })
        .select("id")
        .single();

      if (error) { console.error("[SEED] Failed at PROJECTS:", error.message, error.code); throw error; }
      if (data) projectIdMap[project.id] = data.id;
    }
    console.log(`[SEED] ✓ Created ${Object.keys(projectIdMap).length} projects`);

    // 6. No demo team members
    // Chats + assignments use real auth users only.
    // For sample tasks that reference mock assignees, map to the current team member if available.
    try {
      for (const member of (mockData as any).teamMembers ?? []) {
        if (member?.id && currentTeamMemberId) teamIdMap[member.id] = currentTeamMemberId;
      }
    } catch {
      // ignore
    }

    // 7. Seed Tasks
    console.log("[SEED] Seeding tasks...");
    for (const task of mockData.tasks) {
      const subtaskCompleted = task.checklist.filter((item) => item.completed).length;
      const subtaskTotal = task.checklist.length;

      const resolvedAssigneeId = task.assigneeId
        ? teamIdMap[task.assigneeId] ?? currentTeamMemberId
        : null;

      const { data, error } = await supabaseClient
        .from("tasks")
        .insert({
          user_id: userId,
          project_id: task.projectId ? projectIdMap[task.projectId] : null,
          title: task.title,
          description: task.description,
          stage: task.stage,
          priority: task.priority,
          assignee_id: resolvedAssigneeId ?? null,
          due_date: task.dueDate,
          subtask_total: subtaskTotal,
          subtask_completed: subtaskCompleted,
          comment_count: task.commentCount,
          created_at: task.createdAt,
        })
        .select("id")
        .single();

      if (error) { console.error("[SEED] Failed at TASKS:", error.message, error.code); throw error; }
      if (data) taskIdMap[task.id] = data.id;
    }
    console.log(`[SEED] ✓ Created ${Object.keys(taskIdMap).length} tasks`);

    // 8. Seed Quotes and Line Items
    console.log("[SEED] Seeding quotes...");
    for (const quote of mockData.quotes) {
      const { data, error } = await supabaseClient
        .from("quotes")
        .insert({
          user_id: userId,
          quote_number: quote.quoteNumber,
          contact_id: quote.contactId ? contactIdMap[quote.contactId] : null,
          company_id: quote.companyId ? companyIdMap[quote.companyId] : null,
          deal_id: quote.dealId ? dealIdMap[quote.dealId] : null,
          quote_date: quote.quoteDate.split("T")[0],
          expiry_date: quote.expiryDate.split("T")[0],
          status: quote.status,
          subtotal: quote.subtotal,
          tax: (quote.subtotal * quote.taxRate) / 100,
          discount: quote.discount,
          total: quote.grandTotal,
          notes: quote.notes,
          created_at: quote.createdAt,
        })
        .select("id")
        .single();

      if (error) { console.error("[SEED] Failed at QUOTES:", error.message, error.code); throw error; }
      if (data) {
        quoteIdMap[quote.id] = data.id;

        // Insert quote line items
        if (quote.lineItems && quote.lineItems.length > 0) {
          const lineItems = quote.lineItems.map((item) => ({
            quote_id: data.id,
            product_service: item.product,
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
          }));

          await supabaseClient.from("quote_line_items").insert(lineItems);
        }
      }
    }
    console.log(`[SEED] ✓ Created ${Object.keys(quoteIdMap).length} quotes`);

    // ============================================================
    // E-Commerce Sample Data
    // ============================================================
    const ecData = mockData as any;

    // 9. Seed E-Commerce Categories
    if (ecData.ecommerceCategories?.length) {
      console.log("[SEED] Seeding e-commerce categories...");
      for (const cat of ecData.ecommerceCategories) {
        const { data, error } = await supabaseClient
          .from("categories")
          .insert({
            user_id: userId,
            title: cat.title,
            is_active: cat.isActive,
            cover: cat.cover || null,
          })
          .select("id")
          .single();

        if (error) {
          console.warn("[SEED] Skipping categories (table may not exist):", error.message);
          break;
        }
        if (data) ecCategoryIdMap[cat.id] = data.id;
      }
      console.log(`[SEED] ✓ Created ${Object.keys(ecCategoryIdMap).length} categories`);
    }

    // 10. Seed E-Commerce Products
    if (ecData.ecommerceProducts?.length && Object.keys(ecCategoryIdMap).length > 0) {
      console.log("[SEED] Seeding e-commerce products...");
      for (const prod of ecData.ecommerceProducts) {
        const { data, error } = await supabaseClient
          .from("products")
          .insert({
            user_id: userId,
            name: prod.name,
            description: prod.description,
            price: prod.price,
            stock: prod.stock,
            is_active: prod.isActive,
            category_id: prod.categoryId ? ecCategoryIdMap[prod.categoryId] : null,
            category_name: prod.categoryName || "",
            image_url: prod.imageUrl || null,
          })
          .select("id")
          .single();

        if (error) {
          console.warn("[SEED] Skipping products:", error.message);
          break;
        }
        if (data) ecProductIdMap[prod.id] = data.id;
      }
      console.log(`[SEED] ✓ Created ${Object.keys(ecProductIdMap).length} products`);
    }

    // 11. Seed E-Commerce Stores
    if (ecData.ecommerceStores?.length) {
      console.log("[SEED] Seeding e-commerce stores...");
      for (const store of ecData.ecommerceStores) {
        const { data, error } = await supabaseClient
          .from("stores")
          .insert({
            user_id: userId,
            title: store.title,
            email: store.email || "",
            gsm: store.gsm || "",
            address: store.address || "",
            is_active: store.isActive,
          })
          .select("id")
          .single();

        if (error) {
          console.warn("[SEED] Skipping stores:", error.message);
          break;
        }
        if (data) ecStoreIdMap[store.id] = data.id;
      }
      console.log(`[SEED] ✓ Created ${Object.keys(ecStoreIdMap).length} stores`);
    }

    // 12. Seed E-Commerce Customers
    if (ecData.ecommerceCustomers?.length) {
      console.log("[SEED] Seeding e-commerce customers...");
      for (const cust of ecData.ecommerceCustomers) {
        const { data, error } = await supabaseClient
          .from("customers")
          .insert({
            user_id: userId,
            first_name: cust.firstName,
            last_name: cust.lastName,
            gender: cust.gender || "",
            gsm: cust.gsm || "",
            email: cust.email || "",
            is_active: cust.isActive,
            avatar_url: cust.avatarUrl || null,
            address: cust.address || "",
          })
          .select("id")
          .single();

        if (error) {
          console.warn("[SEED] Skipping customers:", error.message);
          break;
        }
        if (data) ecCustomerIdMap[cust.id] = data.id;
      }
      console.log(`[SEED] ✓ Created ${Object.keys(ecCustomerIdMap).length} customers`);
    }

    // 13. Seed E-Commerce Couriers
    if (ecData.ecommerceCouriers?.length) {
      console.log("[SEED] Seeding e-commerce couriers...");
      for (const courier of ecData.ecommerceCouriers) {
        const { data, error } = await supabaseClient
          .from("couriers")
          .insert({
            user_id: userId,
            name: courier.name,
            surname: courier.surname,
            email: courier.email || "",
            gender: courier.gender || "",
            gsm: courier.gsm || "",
            address: courier.address || "",
            account_number: courier.accountNumber || "",
            license_plate: courier.licensePlate || "",
            avatar_url: courier.avatarUrl || null,
            store_id: courier.storeId ? ecStoreIdMap[courier.storeId] : null,
            store_name: courier.storeName || "",
            status: courier.status || "Available",
            vehicle: courier.vehicle || null,
          })
          .select("id")
          .single();

        if (error) {
          console.warn("[SEED] Skipping couriers:", error.message);
          break;
        }
        if (data) ecCourierIdMap[courier.id] = data.id;
      }
      console.log(`[SEED] ✓ Created ${Object.keys(ecCourierIdMap).length} couriers`);
    }

    // 14. Seed E-Commerce Orders
    if (ecData.ecommerceOrders?.length) {
      console.log("[SEED] Seeding e-commerce orders...");
      for (const order of ecData.ecommerceOrders) {
        const { data, error } = await supabaseClient
          .from("orders")
          .insert({
            user_id: userId,
            amount: order.amount,
            status: order.status,
            customer_id: order.customerId ? ecCustomerIdMap[order.customerId] : null,
            customer_name: order.customerName || "",
            store_id: order.storeId ? ecStoreIdMap[order.storeId] : null,
            store_name: order.storeName || "",
            courier_id: order.courierId ? ecCourierIdMap[order.courierId] : null,
            courier_name: order.courierName || "",
            notes: order.notes || "",
            created_at: order.createdAt,
          })
          .select("id")
          .single();

        if (error) {
          console.warn("[SEED] Skipping orders:", error.message);
          break;
        }
        if (data) ecOrderIdMap[order.id] = data.id;
      }
      console.log(`[SEED] ✓ Created ${Object.keys(ecOrderIdMap).length} orders`);
    }

    // 15. Seed E-Commerce Order Products (junction)
    if (ecData.ecommerceOrderProducts?.length && Object.keys(ecOrderIdMap).length > 0) {
      console.log("[SEED] Seeding e-commerce order products...");
      let opCount = 0;
      for (const op of ecData.ecommerceOrderProducts) {
        const resolvedOrderId = ecOrderIdMap[op.orderId];
        const resolvedProductId = ecProductIdMap[op.productId];
        if (!resolvedOrderId || !resolvedProductId) continue;

        const { error } = await supabaseClient
          .from("order_products")
          .insert({
            user_id: userId,
            order_id: resolvedOrderId,
            product_id: resolvedProductId,
            quantity: op.quantity,
            price: op.price,
            product_name: op.productName || "",
            product_image_url: op.productImageUrl || null,
          });

        if (error) {
          console.warn("[SEED] Skipping order_products:", error.message);
          break;
        }
        opCount++;
      }
      console.log(`[SEED] ✓ Created ${opCount} order products`);
    }

    // 16. Seed E-Commerce Reviews
    if (ecData.ecommerceReviews?.length) {
      console.log("[SEED] Seeding e-commerce reviews...");
      let revCount = 0;
      for (const rev of ecData.ecommerceReviews) {
        const { error } = await supabaseClient
          .from("reviews")
          .insert({
            user_id: userId,
            courier_id: rev.courierId ? ecCourierIdMap[rev.courierId] : null,
            customer_id: rev.customerId ? ecCustomerIdMap[rev.customerId] : null,
            customer_name: rev.customerName || "",
            order_id: rev.orderId ? ecOrderIdMap[rev.orderId] : null,
            star: rev.star,
            text: rev.text || "",
            status: rev.status || "pending",
            created_at: rev.createdAt,
          });

        if (error) {
          console.warn("[SEED] Skipping reviews:", error.message);
          break;
        }
        revCount++;
      }
      console.log(`[SEED] ✓ Created ${revCount} reviews`);
    }

    // 17. Seed Staff
    const staffData = (mockData as any).staff || [];
    if (staffData.length) {
      console.log("[SEED] Seeding staff...");
      let staffCount = 0;
      for (const s of staffData) {
        const { error } = await supabaseClient
          .from("staff")
          .insert({
            user_id: userId,
            first_name: s.firstName,
            last_name: s.lastName,
            email: s.email,
            phone: s.phone || null,
            department: s.department,
            job_title: s.jobTitle,
            employment_type: s.employmentType,
            salary: s.salary || null,
            start_date: s.startDate,
            status: s.status || "Active",
            avatar_url: s.avatar || null,
            notes: s.notes || null,
          });

        if (error) {
          console.warn("[SEED] Skipping staff:", error.message);
          break;
        }
        staffCount++;
      }
      console.log(`[SEED] ✓ Created ${staffCount} staff members`);
    }

    // 18. Seed Email Templates
    const emailTemplateData = (mockData as any).emailTemplates || [];
    if (emailTemplateData.length) {
      console.log("[SEED] Seeding email templates...");
      let etCount = 0;
      for (const et of emailTemplateData) {
        const { error } = await supabaseClient
          .from("email_templates")
          .insert({
            user_id: userId,
            name: et.name,
            subject: et.subject || "",
            body: et.body || "",
            category: et.category || "general",
            variables: et.variables || [],
            is_active: et.isActive ?? true,
          });
        if (error) {
          console.warn("[SEED] Skipping email template:", error.message);
          break;
        }
        etCount++;
      }
      console.log(`[SEED] ✓ Created ${etCount} email templates`);
    }

    // 19. Seed Emails (sent history)
    const emailData = (mockData as any).emails || [];
    if (emailData.length) {
      console.log("[SEED] Seeding emails...");
      let emCount = 0;
      for (const em of emailData) {
        // Generate snippet from body if not provided
        const snippet = em.snippet || (em.body || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 200);

        const { error } = await supabaseClient
          .from("emails")
          .insert({
            user_id: userId,
            from_address: em.fromAddress || "",
            from_name: em.fromName || "",
            to_addresses: em.toAddresses || [],
            cc_addresses: em.ccAddresses || [],
            bcc_addresses: em.bccAddresses || [],
            reply_to: em.replyTo || "",
            subject: em.subject || "",
            body: em.body || "",
            status: em.status || "sent",
            category: em.category || "general",
            error_message: em.errorMessage || "",
            folder: em.folder || "sent",
            is_read: em.isRead !== undefined ? em.isRead : true,
            external_id: em.externalId || null,
            // RFC 5322 standard fields
            message_id: em.messageId || `<${em.id}@phoxta.app>`,
            in_reply_to: em.inReplyTo || null,
            thread_id: em.threadId || null,
            snippet,
            is_starred: em.isStarred || false,
            has_attachments: em.hasAttachments || false,
            labels: em.labels || [],
            sent_at: em.sentAt || null,
            created_at: em.createdAt,
          });
        if (error) {
          console.warn("[SEED] Skipping email:", error.message);
          break;
        }
        emCount++;
      }
      console.log(`[SEED] ✓ Created ${emCount} emails`);
    }

    console.log("[SEED] ✅ Database seeding completed successfully!");

    return {
      success: true,
      message: "Sample data loaded successfully! You can now explore and manage your CRM data.",
    };
  } catch (error) {
    // Extract detailed error message — Supabase PostgrestError objects don't display
    // well with console.error, so we extract all properties explicitly.
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "object" && error !== null) {
      const e = error as Record<string, unknown>;
      errorMessage = e.message
        ? `${e.message} (code: ${e.code ?? "?"}, details: ${e.details ?? "none"}, hint: ${e.hint ?? "none"})`
        : JSON.stringify(error, null, 2);
    } else {
      errorMessage = String(error);
    }

    console.error("[SEED] ❌ Error seeding database:", errorMessage);

    return {
      success: false,
      message: "Failed to load sample data",
      error: errorMessage,
    };
  }
}

/**
 * Clear all user data from the database
 */
export async function clearUserData(): Promise<SeedResult> {
  try {
    const { data: userData } = await supabaseClient.auth.getUser();
    if (!userData?.user) {
      return {
        success: false,
        message: "No authenticated user found",
      };
    }

    const userId = userData.user.id;
    console.log("[CLEAR] Clearing all data for user:", userId);

    // Delete in reverse order of dependencies
    // Junction tables first (delete all related to user's records)
    await supabaseClient.from("deal_tags").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabaseClient.from("contact_tags").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabaseClient.from("attachments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabaseClient.from("comments").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Quote line items
    await supabaseClient.from("quote_line_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Staff table
    try {
      await supabaseClient.from("staff").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      console.log("[CLEAR] ✓ Staff data cleared");
    } catch (e) {
      console.log("[CLEAR] Staff table not present, skipping");
    }

    // Email tables (emails first since they reference templates and accounts)
    try {
      await supabaseClient.from("emails").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabaseClient.from("email_templates").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabaseClient.from("email_accounts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      console.log("[CLEAR] ✓ Email data cleared");
    } catch (e) {
      console.log("[CLEAR] Email tables not present, skipping");
    }

    // E-commerce tables (junction first, then main)
    try {
      await supabaseClient.from("reviews").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabaseClient.from("order_products").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabaseClient.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabaseClient.from("couriers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabaseClient.from("customers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabaseClient.from("stores").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabaseClient.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabaseClient.from("categories").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      console.log("[CLEAR] ✓ E-commerce data cleared");
    } catch (e) {
      console.log("[CLEAR] E-commerce tables not present, skipping");
    }

    // Main tables (RLS will handle user filtering)
    await supabaseClient.from("collections").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabaseClient.from("quotes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabaseClient.from("tasks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    // Keep team_members profile (real auth user identity for chat)
    await supabaseClient.from("projects").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabaseClient.from("deals").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabaseClient.from("contacts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabaseClient.from("companies").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabaseClient.from("tags").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    console.log("[CLEAR] ✅ All user data cleared successfully!");

    return {
      success: true,
      message: "All data has been cleared successfully",
    };
  } catch (error) {
    console.error("[CLEAR] ❌ Error clearing data:", error);
    return {
      success: false,
      message: "Failed to clear data",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
