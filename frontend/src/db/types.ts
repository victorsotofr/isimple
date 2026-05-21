// Types Supabase — générés manuellement pour Phase 1–4 (migrations 0001–0018)
// À régénérer via scripts/gen-db-types.sh après chaque migration

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type DocumentType = 'bail' | 'caution' | 'quittance' | 'etat_des_lieux' | 'assurance' | 'rib' | 'caf' | 'piece_identite' | 'mandat' | 'facture' | 'autre';
export type DocumentVisibility = 'internal' | 'tenant' | 'landlord' | 'provider' | 'shared';
export type DocumentProcessingStatus = 'uploaded' | 'parsed' | 'extracted' | 'matched' | 'reviewed' | 'indexed' | 'failed';
export type DocumentDeliveryChannel = 'email' | 'sms' | 'whatsapp' | 'portal' | 'download' | 'manual';
export type DocumentRecipientType = 'tenant' | 'landlord' | 'provider' | 'agency' | 'other';
export type DocumentDeliveryStatus = 'prepared' | 'sent' | 'failed';
export type DocumentProcessingJobStage = 'uploaded' | 'parsed' | 'extracted' | 'matched' | 'reviewed' | 'indexed' | 'delivery';
export type DocumentProcessingJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';
export type VectorStoreProvider = 'openai' | 'pinecone' | 'supabase';
export type VectorStoreScope = 'workspace' | 'tenant' | 'lot';
export type VectorStoreStatus = 'pending' | 'ready' | 'syncing' | 'failed' | 'deleted';
export type DocumentExternalFileStatus = 'queued' | 'uploading' | 'indexed' | 'failed' | 'deleted';
export type GmailConnectionStatus = 'connected' | 'revoked' | 'error';
export type TicketStatus = 'open' | 'in_progress' | 'waiting_provider' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketSource = 'manual' | 'inbox' | 'gmail' | 'document' | 'system';
export type TicketResponsibility = 'tenant' | 'landlord' | 'provider' | 'unknown';
export type TicketEventType = 'created' | 'status_changed' | 'priority_changed' | 'provider_changed' | 'due_date_changed' | 'assignment_changed' | 'ai_suggestion' | 'note';
export type ComplianceItemStatus = 'missing' | 'pending_review' | 'complete' | 'waived';
export type NotificationStatus = 'unread' | 'read' | 'dismissed';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          slug: string;
          name: string;
          plan: string;
          created_by: string;
          created_at: string;
          settings: Json;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          plan?: string;
          created_by: string;
          created_at?: string;
          settings?: Json;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          plan?: string;
          created_by?: string;
          created_at?: string;
          settings?: Json;
        };
      };
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: 'admin' | 'member';
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role?: 'admin' | 'member';
          created_at?: string;
        };
        Update: {
          workspace_id?: string;
          user_id?: string;
          role?: 'admin' | 'member';
          created_at?: string;
        };
      };
      workspace_invitations: {
        Row: {
          id: string;
          workspace_id: string;
          email: string;
          token: string;
          role: 'admin' | 'member';
          status: 'pending' | 'accepted' | 'expired';
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          email: string;
          token?: string;
          role?: 'admin' | 'member';
          status?: 'pending' | 'accepted' | 'expired';
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          email?: string;
          token?: string;
          role?: 'admin' | 'member';
          status?: 'pending' | 'accepted' | 'expired';
          expires_at?: string;
          created_at?: string;
        };
      };
      lots: {
        Row: {
          id: string;
          workspace_id: string;
          address: string;
          city: string;
          postal_code: string;
          type: 'apartment' | 'house' | 'studio' | 'parking' | 'commercial' | 'other';
          area_m2: number | null;
          rent_amount: number;
          charges_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          address: string;
          city: string;
          postal_code: string;
          type: 'apartment' | 'house' | 'studio' | 'parking' | 'commercial' | 'other';
          area_m2?: number | null;
          rent_amount: number;
          charges_amount?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          address?: string;
          city?: string;
          postal_code?: string;
          type?: 'apartment' | 'house' | 'studio' | 'parking' | 'commercial' | 'other';
          area_m2?: number | null;
          rent_amount?: number;
          charges_amount?: number;
          created_at?: string;
        };
      };
      tenants: {
        Row: {
          id: string;
          workspace_id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string | null;
          created_at?: string;
        };
      };
      leases: {
        Row: {
          id: string;
          workspace_id: string;
          lot_id: string;
          tenant_id: string;
          start_date: string;
          end_date: string | null;
          rent_amount: number;
          charges_amount: number;
          deposit_amount: number;
          status: 'active' | 'ended' | 'pending';
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          lot_id: string;
          tenant_id: string;
          start_date: string;
          end_date?: string | null;
          rent_amount: number;
          charges_amount?: number;
          deposit_amount?: number;
          status?: 'active' | 'ended' | 'pending';
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          lot_id?: string;
          tenant_id?: string;
          start_date?: string;
          end_date?: string | null;
          rent_amount?: number;
          charges_amount?: number;
          deposit_amount?: number;
          status?: 'active' | 'ended' | 'pending';
          created_at?: string;
        };
      };
      providers: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          specialty: string;
          company: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          notes: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          specialty?: string;
          company?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          specialty?: string;
          company?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      tickets: {
        Row: {
          id: string;
          workspace_id: string;
          lot_id: string | null;
          tenant_id: string | null;
          provider_id: string | null;
          title: string;
          description: string | null;
          status: TicketStatus;
          priority: TicketPriority;
          due_at: string | null;
          source: TicketSource;
          source_ref: string | null;
          ai_summary: string | null;
          responsibility: TicketResponsibility | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          lot_id?: string | null;
          tenant_id?: string | null;
          provider_id?: string | null;
          title: string;
          description?: string | null;
          status?: TicketStatus;
          priority?: TicketPriority;
          due_at?: string | null;
          source?: TicketSource;
          source_ref?: string | null;
          ai_summary?: string | null;
          responsibility?: TicketResponsibility | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          lot_id?: string | null;
          tenant_id?: string | null;
          provider_id?: string | null;
          title?: string;
          description?: string | null;
          status?: TicketStatus;
          priority?: TicketPriority;
          due_at?: string | null;
          source?: TicketSource;
          source_ref?: string | null;
          ai_summary?: string | null;
          responsibility?: TicketResponsibility | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ticket_events: {
        Row: {
          id: string;
          workspace_id: string;
          ticket_id: string;
          event_type: TicketEventType;
          title: string;
          body: string | null;
          metadata: Json;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          ticket_id: string;
          event_type?: TicketEventType;
          title: string;
          body?: string | null;
          metadata?: Json;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          ticket_id?: string;
          event_type?: TicketEventType;
          title?: string;
          body?: string | null;
          metadata?: Json;
          created_by?: string | null;
          created_at?: string;
        };
      };
      compliance_items: {
        Row: {
          id: string;
          workspace_id: string;
          lot_id: string | null;
          lease_id: string | null;
          document_id: string | null;
          item_type: string;
          label: string;
          status: ComplianceItemStatus;
          due_at: string | null;
          notes: string | null;
          metadata: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          lot_id?: string | null;
          lease_id?: string | null;
          document_id?: string | null;
          item_type: string;
          label: string;
          status?: ComplianceItemStatus;
          due_at?: string | null;
          notes?: string | null;
          metadata?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          lot_id?: string | null;
          lease_id?: string | null;
          document_id?: string | null;
          item_type?: string;
          label?: string;
          status?: ComplianceItemStatus;
          due_at?: string | null;
          notes?: string | null;
          metadata?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string | null;
          title: string;
          body: string | null;
          status: NotificationStatus;
          priority: NotificationPriority;
          action_href: string | null;
          metadata: Json;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id?: string | null;
          title: string;
          body?: string | null;
          status?: NotificationStatus;
          priority?: NotificationPriority;
          action_href?: string | null;
          metadata?: Json;
          created_at?: string;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string | null;
          title?: string;
          body?: string | null;
          status?: NotificationStatus;
          priority?: NotificationPriority;
          action_href?: string | null;
          metadata?: Json;
          created_at?: string;
          read_at?: string | null;
        };
      };
      audit_events: {
        Row: {
          id: string;
          workspace_id: string;
          actor_user_id: string | null;
          event_type: string;
          entity_type: string;
          entity_id: string | null;
          summary: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          actor_user_id?: string | null;
          event_type: string;
          entity_type: string;
          entity_id?: string | null;
          summary: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          actor_user_id?: string | null;
          event_type?: string;
          entity_type?: string;
          entity_id?: string | null;
          summary?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          workspace_id: string;
          tenant_id: string | null;
          lease_id: string | null;
          subject: string;
          category: 'maintenance' | 'paiement' | 'réclamation' | 'document' | 'information' | 'autre';
          status: 'open' | 'closed' | 'pending';
          created_at: string;
          last_message_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          tenant_id?: string | null;
          lease_id?: string | null;
          subject: string;
          category?: 'maintenance' | 'paiement' | 'réclamation' | 'document' | 'information' | 'autre';
          status?: 'open' | 'closed' | 'pending';
          created_at?: string;
          last_message_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          tenant_id?: string | null;
          lease_id?: string | null;
          subject?: string;
          category?: 'maintenance' | 'paiement' | 'réclamation' | 'document' | 'information' | 'autre';
          status?: 'open' | 'closed' | 'pending';
          created_at?: string;
          last_message_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          workspace_id: string;
          file_name: string;
          file_path: string;
          doc_type: DocumentType;
          status: 'pending' | 'confirmed';
          extracted_data: Json | null;
          lot_id: string | null;
          tenant_id: string | null;
          visibility: DocumentVisibility;
          processing_status: DocumentProcessingStatus;
          parsed_text: string | null;
          parser_provider: string | null;
          indexed_at: string | null;
          content_hash: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          file_name: string;
          file_path: string;
          doc_type?: DocumentType;
          status?: 'pending' | 'confirmed';
          extracted_data?: Json | null;
          lot_id?: string | null;
          tenant_id?: string | null;
          visibility?: DocumentVisibility;
          processing_status?: DocumentProcessingStatus;
          parsed_text?: string | null;
          parser_provider?: string | null;
          indexed_at?: string | null;
          content_hash?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          file_name?: string;
          file_path?: string;
          doc_type?: DocumentType;
          status?: 'pending' | 'confirmed';
          extracted_data?: Json | null;
          lot_id?: string | null;
          tenant_id?: string | null;
          visibility?: DocumentVisibility;
          processing_status?: DocumentProcessingStatus;
          parsed_text?: string | null;
          parser_provider?: string | null;
          indexed_at?: string | null;
          content_hash?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      document_processing_jobs: {
        Row: {
          id: string;
          workspace_id: string;
          document_id: string | null;
          stage: DocumentProcessingJobStage;
          status: DocumentProcessingJobStatus;
          provider: string | null;
          model: string | null;
          input: Json;
          output: Json;
          error: string | null;
          attempts: number;
          started_at: string | null;
          finished_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          document_id?: string | null;
          stage: DocumentProcessingJobStage;
          status?: DocumentProcessingJobStatus;
          provider?: string | null;
          model?: string | null;
          input?: Json;
          output?: Json;
          error?: string | null;
          attempts?: number;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          document_id?: string | null;
          stage?: DocumentProcessingJobStage;
          status?: DocumentProcessingJobStatus;
          provider?: string | null;
          model?: string | null;
          input?: Json;
          output?: Json;
          error?: string | null;
          attempts?: number;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
        };
      };
      document_deliveries: {
        Row: {
          id: string;
          workspace_id: string;
          document_id: string;
          channel: DocumentDeliveryChannel;
          recipient_type: DocumentRecipientType;
          recipient_id: string | null;
          recipient_address: string | null;
          status: DocumentDeliveryStatus;
          message: string | null;
          signed_url: string | null;
          signed_url_expires_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          document_id: string;
          channel: DocumentDeliveryChannel;
          recipient_type: DocumentRecipientType;
          recipient_id?: string | null;
          recipient_address?: string | null;
          status?: DocumentDeliveryStatus;
          message?: string | null;
          signed_url?: string | null;
          signed_url_expires_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          document_id?: string;
          channel?: DocumentDeliveryChannel;
          recipient_type?: DocumentRecipientType;
          recipient_id?: string | null;
          recipient_address?: string | null;
          status?: DocumentDeliveryStatus;
          message?: string | null;
          signed_url?: string | null;
          signed_url_expires_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      document_tenants: {
        Row: {
          document_id: string;
          tenant_id: string;
          workspace_id: string;
          created_at: string;
        };
        Insert: {
          document_id: string;
          tenant_id: string;
          workspace_id: string;
          created_at?: string;
        };
        Update: {
          document_id?: string;
          tenant_id?: string;
          workspace_id?: string;
          created_at?: string;
        };
      };
      workspace_vector_stores: {
        Row: {
          id: string;
          workspace_id: string;
          provider: VectorStoreProvider;
          scope: VectorStoreScope;
          scope_id: string | null;
          name: string;
          external_id: string | null;
          status: VectorStoreStatus;
          usage_bytes: number | null;
          metadata: Json;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          provider: VectorStoreProvider;
          scope?: VectorStoreScope;
          scope_id?: string | null;
          name: string;
          external_id?: string | null;
          status?: VectorStoreStatus;
          usage_bytes?: number | null;
          metadata?: Json;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          provider?: VectorStoreProvider;
          scope?: VectorStoreScope;
          scope_id?: string | null;
          name?: string;
          external_id?: string | null;
          status?: VectorStoreStatus;
          usage_bytes?: number | null;
          metadata?: Json;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      document_external_files: {
        Row: {
          id: string;
          workspace_id: string;
          workspace_vector_store_id: string;
          document_id: string;
          provider: VectorStoreProvider;
          external_file_id: string | null;
          external_vector_file_id: string | null;
          status: DocumentExternalFileStatus;
          attributes: Json;
          error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          workspace_vector_store_id: string;
          document_id: string;
          provider: VectorStoreProvider;
          external_file_id?: string | null;
          external_vector_file_id?: string | null;
          status?: DocumentExternalFileStatus;
          attributes?: Json;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          workspace_vector_store_id?: string;
          document_id?: string;
          provider?: VectorStoreProvider;
          external_file_id?: string | null;
          external_vector_file_id?: string | null;
          status?: DocumentExternalFileStatus;
          attributes?: Json;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      gmail_connections: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          email: string;
          access_token_encrypted: string;
          refresh_token_encrypted: string | null;
          scope: string[];
          token_type: string | null;
          expires_at: string | null;
          status: GmailConnectionStatus;
          last_sync_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          email: string;
          access_token_encrypted: string;
          refresh_token_encrypted?: string | null;
          scope?: string[];
          token_type?: string | null;
          expires_at?: string | null;
          status?: GmailConnectionStatus;
          last_sync_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          email?: string;
          access_token_encrypted?: string;
          refresh_token_encrypted?: string | null;
          scope?: string[];
          token_type?: string | null;
          expires_at?: string | null;
          status?: GmailConnectionStatus;
          last_sync_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      gmail_threads_cache: {
        Row: {
          id: string;
          workspace_id: string;
          gmail_connection_id: string;
          thread_id: string;
          message_id: string | null;
          from_email: string | null;
          from_name: string | null;
          to_emails: string[];
          subject: string | null;
          snippet: string | null;
          received_at: string | null;
          labels: string[];
          unread: boolean;
          raw: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          gmail_connection_id: string;
          thread_id: string;
          message_id?: string | null;
          from_email?: string | null;
          from_name?: string | null;
          to_emails?: string[];
          subject?: string | null;
          snippet?: string | null;
          received_at?: string | null;
          labels?: string[];
          unread?: boolean;
          raw?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          gmail_connection_id?: string;
          thread_id?: string;
          message_id?: string | null;
          from_email?: string | null;
          from_name?: string | null;
          to_emails?: string[];
          subject?: string | null;
          snippet?: string | null;
          received_at?: string | null;
          labels?: string[];
          unread?: boolean;
          raw?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          workspace_id: string;
          content: string;
          role: 'tenant' | 'manager' | 'ai';
          is_ai_draft: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          workspace_id: string;
          content: string;
          role: 'tenant' | 'manager' | 'ai';
          is_ai_draft?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          workspace_id?: string;
          content?: string;
          role?: 'tenant' | 'manager' | 'ai';
          is_ai_draft?: boolean;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Document = Database['public']['Tables']['documents']['Row'];
export type DocumentProcessingJob = Database['public']['Tables']['document_processing_jobs']['Row'];
export type DocumentDelivery = Database['public']['Tables']['document_deliveries']['Row'];
export type DocumentTenant = Database['public']['Tables']['document_tenants']['Row'];
export type WorkspaceVectorStore = Database['public']['Tables']['workspace_vector_stores']['Row'];
export type DocumentExternalFile = Database['public']['Tables']['document_external_files']['Row'];
export type GmailConnection = Database['public']['Tables']['gmail_connections']['Row'];
export type GmailThreadCache = Database['public']['Tables']['gmail_threads_cache']['Row'];
export type Workspace = Database['public']['Tables']['workspaces']['Row'];
export type WorkspaceMember = Database['public']['Tables']['workspace_members']['Row'];
export type WorkspaceInvitation = Database['public']['Tables']['workspace_invitations']['Row'];
export type Lot = Database['public']['Tables']['lots']['Row'];
export type Tenant = Database['public']['Tables']['tenants']['Row'];
export type Lease = Database['public']['Tables']['leases']['Row'];
export type Provider = Database['public']['Tables']['providers']['Row'];
export type Ticket = Database['public']['Tables']['tickets']['Row'];
export type TicketEvent = Database['public']['Tables']['ticket_events']['Row'];
export type ComplianceItem = Database['public']['Tables']['compliance_items']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type AuditEvent = Database['public']['Tables']['audit_events']['Row'];
export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];

export type WorkspaceRole = 'admin' | 'member';
export type InvitationStatus = 'pending' | 'accepted' | 'expired';
export type LotType = Lot['type'];
export type LeaseStatus = Lease['status'];
export type ConversationCategory = Conversation['category'];
export type ConversationStatus = Conversation['status'];
export type MessageRole = Message['role'];
