export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      accounting_rules: {
        Row: {
          contrapartida_id: string
          created_at: string
          created_by: string | null
          id: string
          iva_id: string | null
          movimiento: string
          nombre: string
          principal_id: string
          retencion_id: string | null
          updated_at: string
          updated_by: string | null
          variante: string
        }
        Insert: {
          contrapartida_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          iva_id?: string | null
          movimiento: string
          nombre: string
          principal_id: string
          retencion_id?: string | null
          updated_at?: string
          updated_by?: string | null
          variante?: string
        }
        Update: {
          contrapartida_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          iva_id?: string | null
          movimiento?: string
          nombre?: string
          principal_id?: string
          retencion_id?: string | null
          updated_at?: string
          updated_by?: string | null
          variante?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_rules_contrapartida_id_fkey"
            columns: ["contrapartida_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_rules_iva_id_fkey"
            columns: ["iva_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_rules_principal_id_fkey"
            columns: ["principal_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_rules_retencion_id_fkey"
            columns: ["retencion_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          categoria: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          descripcion: string | null
          estado: Database["public"]["Enums"]["record_status"]
          external_id: string | null
          id: string
          logo_url: string | null
          modelo_cobro: string | null
          nombre: string
          precio_base: number | null
          precio_uso: number | null
          precio_usuario: number | null
          proveedor: string | null
          updated_at: string
          updated_by: string | null
          url: string | null
          uuid: string
          version: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["record_status"]
          external_id?: string | null
          id?: string
          logo_url?: string | null
          modelo_cobro?: string | null
          nombre: string
          precio_base?: number | null
          precio_uso?: number | null
          precio_usuario?: number | null
          proveedor?: string | null
          updated_at?: string
          updated_by?: string | null
          url?: string | null
          uuid?: string
          version?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["record_status"]
          external_id?: string | null
          id?: string
          logo_url?: string | null
          modelo_cobro?: string | null
          nombre?: string
          precio_base?: number | null
          precio_uso?: number | null
          precio_usuario?: number | null
          proveedor?: string | null
          updated_at?: string
          updated_by?: string | null
          url?: string | null
          uuid?: string
          version?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          accion: string
          created_at: string
          entidad: string
          entidad_id: string | null
          id: string
          ip: string | null
          modulo: string
          user_email: string | null
          user_id: string | null
          valor_anterior: Json | null
          valor_nuevo: Json | null
        }
        Insert: {
          accion: string
          created_at?: string
          entidad: string
          entidad_id?: string | null
          id?: string
          ip?: string | null
          modulo: string
          user_email?: string | null
          user_id?: string | null
          valor_anterior?: Json | null
          valor_nuevo?: Json | null
        }
        Update: {
          accion?: string
          created_at?: string
          entidad?: string
          entidad_id?: string | null
          id?: string
          ip?: string | null
          modulo?: string
          user_email?: string | null
          user_id?: string | null
          valor_anterior?: Json | null
          valor_nuevo?: Json | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          direccion: string | null
          email: string | null
          estado: Database["public"]["Enums"]["record_status"]
          etiquetas: string[] | null
          external_id: string | null
          fecha_alta: string | null
          fecha_baja: string | null
          id: string
          nif: string | null
          nombre_comercial: string | null
          num_empleados: number | null
          observaciones: string | null
          pais: string | null
          persona_contacto: string | null
          provincia: string | null
          razon_social: string
          sector: string | null
          telefono: string | null
          updated_at: string
          updated_by: string | null
          uuid: string
          web: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          direccion?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["record_status"]
          etiquetas?: string[] | null
          external_id?: string | null
          fecha_alta?: string | null
          fecha_baja?: string | null
          id?: string
          nif?: string | null
          nombre_comercial?: string | null
          num_empleados?: number | null
          observaciones?: string | null
          pais?: string | null
          persona_contacto?: string | null
          provincia?: string | null
          razon_social: string
          sector?: string | null
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
          uuid?: string
          web?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          direccion?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["record_status"]
          etiquetas?: string[] | null
          external_id?: string | null
          fecha_alta?: string | null
          fecha_baja?: string | null
          id?: string
          nif?: string | null
          nombre_comercial?: string | null
          num_empleados?: number | null
          observaciones?: string | null
          pais?: string | null
          persona_contacto?: string | null
          provincia?: string | null
          razon_social?: string
          sector?: string | null
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
          uuid?: string
          web?: string | null
        }
        Relationships: []
      }
      cost_centers: {
        Row: {
          codigo: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          descripcion: string | null
          estado: Database["public"]["Enums"]["record_status"]
          id: string
          nombre: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          codigo: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["record_status"]
          id?: string
          nombre: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          codigo?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["record_status"]
          id?: string
          nombre?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          codigo: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          descripcion: string | null
          estado: Database["public"]["Enums"]["record_status"]
          id: string
          tipo: string
          updated_at: string
          updated_by: string | null
          usos_actuales: number
          usos_maximos: number | null
          valido_desde: string | null
          valido_hasta: string | null
          valor: number
        }
        Insert: {
          codigo: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["record_status"]
          id?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          usos_actuales?: number
          usos_maximos?: number | null
          valido_desde?: string | null
          valido_hasta?: string | null
          valor?: number
        }
        Update: {
          codigo?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["record_status"]
          id?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          usos_actuales?: number
          usos_maximos?: number | null
          valido_desde?: string | null
          valido_hasta?: string | null
          valor?: number
        }
        Relationships: []
      }
      documents: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          descripcion: string | null
          estado: Database["public"]["Enums"]["record_status"]
          etiquetas: string[] | null
          id: string
          invoice_id: string | null
          mime_type: string | null
          nombre: string
          parent_document_id: string | null
          storage_path: string | null
          tamano_bytes: number | null
          tipo: Database["public"]["Enums"]["doc_type"]
          updated_at: string
          updated_by: string | null
          uuid: string
          version: number
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["record_status"]
          etiquetas?: string[] | null
          id?: string
          invoice_id?: string | null
          mime_type?: string | null
          nombre: string
          parent_document_id?: string | null
          storage_path?: string | null
          tamano_bytes?: number | null
          tipo?: Database["public"]["Enums"]["doc_type"]
          updated_at?: string
          updated_by?: string | null
          uuid?: string
          version?: number
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["record_status"]
          etiquetas?: string[] | null
          id?: string
          invoice_id?: string | null
          mime_type?: string | null
          nombre?: string
          parent_document_id?: string | null
          storage_path?: string | null
          tamano_bytes?: number | null
          tipo?: Database["public"]["Enums"]["doc_type"]
          updated_at?: string
          updated_by?: string | null
          uuid?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          application_id: string | null
          cantidad: number
          concepto: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          descuento_pct: number
          id: string
          importe: number
          invoice_id: string
          iva_pct: number
          orden: number
          precio_unitario: number
          tipo_cargo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          application_id?: string | null
          cantidad?: number
          concepto: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descuento_pct?: number
          id?: string
          importe?: number
          invoice_id: string
          iva_pct?: number
          orden?: number
          precio_unitario?: number
          tipo_cargo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          application_id?: string | null
          cantidad?: number
          concepto?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descuento_pct?: number
          id?: string
          importe?: number
          invoice_id?: string
          iva_pct?: number
          orden?: number
          precio_unitario?: number
          tipo_cargo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_series: {
        Row: {
          codigo: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          descripcion: string | null
          ejercicio: number
          estado: Database["public"]["Enums"]["record_status"]
          id: string
          prefijo: string
          proximo_numero: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          codigo: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          ejercicio?: number
          estado?: Database["public"]["Enums"]["record_status"]
          id?: string
          prefijo: string
          proximo_numero?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          codigo?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          ejercicio?: number
          estado?: Database["public"]["Enums"]["record_status"]
          id?: string
          prefijo?: string
          proximo_numero?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          base_imponible: number
          client_id: string | null
          coupon_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          descuento: number
          estado: Database["public"]["Enums"]["invoice_status"]
          factura_origen_id: string | null
          fecha_emision: string
          fecha_vencimiento: string | null
          id: string
          iva: number
          moneda: string
          notas: string | null
          numero: string
          pagado: number
          periodicidad: Database["public"]["Enums"]["billing_period"]
          periodo_desde: string | null
          periodo_hasta: string | null
          retencion: number
          serie_id: string | null
          tipo: Database["public"]["Enums"]["invoice_type"]
          total: number
          updated_at: string
          updated_by: string | null
          uuid: string
        }
        Insert: {
          base_imponible?: number
          client_id?: string | null
          coupon_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descuento?: number
          estado?: Database["public"]["Enums"]["invoice_status"]
          factura_origen_id?: string | null
          fecha_emision?: string
          fecha_vencimiento?: string | null
          id?: string
          iva?: number
          moneda?: string
          notas?: string | null
          numero: string
          pagado?: number
          periodicidad?: Database["public"]["Enums"]["billing_period"]
          periodo_desde?: string | null
          periodo_hasta?: string | null
          retencion?: number
          serie_id?: string | null
          tipo?: Database["public"]["Enums"]["invoice_type"]
          total?: number
          updated_at?: string
          updated_by?: string | null
          uuid?: string
        }
        Update: {
          base_imponible?: number
          client_id?: string | null
          coupon_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descuento?: number
          estado?: Database["public"]["Enums"]["invoice_status"]
          factura_origen_id?: string | null
          fecha_emision?: string
          fecha_vencimiento?: string | null
          id?: string
          iva?: number
          moneda?: string
          notas?: string | null
          numero?: string
          pagado?: number
          periodicidad?: Database["public"]["Enums"]["billing_period"]
          periodo_desde?: string | null
          periodo_hasta?: string | null
          retencion?: number
          serie_id?: string | null
          tipo?: Database["public"]["Enums"]["invoice_type"]
          total?: number
          updated_at?: string
          updated_by?: string | null
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_factura_origen_id_fkey"
            columns: ["factura_origen_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_serie_id_fkey"
            columns: ["serie_id"]
            isOneToOne: false
            referencedRelation: "invoice_series"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          concepto: string
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          ejercicio: number
          estado: Database["public"]["Enums"]["record_status"]
          fecha: string
          id: string
          invoice_id: string | null
          numero: string
          reversal_of: string | null
          reversed_at: string | null
          source_fingerprint: string | null
          source_id: string | null
          source_table: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          concepto: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          ejercicio?: number
          estado?: Database["public"]["Enums"]["record_status"]
          fecha?: string
          id?: string
          invoice_id?: string | null
          numero: string
          reversal_of?: string | null
          reversed_at?: string | null
          source_fingerprint?: string | null
          source_id?: string | null
          source_table?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          concepto?: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          ejercicio?: number
          estado?: Database["public"]["Enums"]["record_status"]
          fecha?: string
          id?: string
          invoice_id?: string | null
          numero?: string
          reversal_of?: string | null
          reversed_at?: string | null
          source_fingerprint?: string | null
          source_id?: string | null
          source_table?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_reversal_of_fkey"
            columns: ["reversal_of"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string
          created_at: string
          created_by: string | null
          debe: number
          deleted_at: string | null
          descripcion: string | null
          entry_id: string
          haber: number
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by?: string | null
          debe?: number
          deleted_at?: string | null
          descripcion?: string | null
          entry_id: string
          haber?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string | null
          debe?: number
          deleted_at?: string | null
          descripcion?: string | null
          entry_id?: string
          haber?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_accounts: {
        Row: {
          codigo: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          estado: Database["public"]["Enums"]["record_status"]
          id: string
          naturaleza: Database["public"]["Enums"]["account_kind"]
          nombre: string
          parent_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          codigo: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          estado?: Database["public"]["Enums"]["record_status"]
          id?: string
          naturaleza: Database["public"]["Enums"]["account_kind"]
          nombre: string
          parent_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          codigo?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          estado?: Database["public"]["Enums"]["record_status"]
          id?: string
          naturaleza?: Database["public"]["Enums"]["account_kind"]
          nombre?: string
          parent_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      numbering_patterns: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          entidad: string
          estado: Database["public"]["Enums"]["record_status"]
          id: string
          nombre: string
          patron: string
          periodo_actual: string | null
          proximo_numero: number
          reinicio: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          entidad: string
          estado?: Database["public"]["Enums"]["record_status"]
          id?: string
          nombre: string
          patron: string
          periodo_actual?: string | null
          proximo_numero?: number
          reinicio?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          entidad?: string
          estado?: Database["public"]["Enums"]["record_status"]
          id?: string
          nombre?: string
          patron?: string
          periodo_actual?: string | null
          proximo_numero?: number
          reinicio?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          aviso_enviado: boolean
          client_id: string | null
          conciliado: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          estado: Database["public"]["Enums"]["payment_status"]
          fecha_cobro: string | null
          fecha_conciliacion: string | null
          fecha_devolucion: string | null
          fecha_prevista: string | null
          id: string
          importe: number
          invoice_id: string | null
          metodo: Database["public"]["Enums"]["payment_method"]
          observaciones: string | null
          referencia: string
          updated_at: string
          updated_by: string | null
          uuid: string
        }
        Insert: {
          aviso_enviado?: boolean
          client_id?: string | null
          conciliado?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          estado?: Database["public"]["Enums"]["payment_status"]
          fecha_cobro?: string | null
          fecha_conciliacion?: string | null
          fecha_devolucion?: string | null
          fecha_prevista?: string | null
          id?: string
          importe?: number
          invoice_id?: string | null
          metodo?: Database["public"]["Enums"]["payment_method"]
          observaciones?: string | null
          referencia: string
          updated_at?: string
          updated_by?: string | null
          uuid?: string
        }
        Update: {
          aviso_enviado?: boolean
          client_id?: string | null
          conciliado?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          estado?: Database["public"]["Enums"]["payment_status"]
          fecha_cobro?: string | null
          fecha_conciliacion?: string | null
          fecha_devolucion?: string | null
          fecha_prevista?: string | null
          id?: string
          importe?: number
          invoice_id?: string | null
          metodo?: Database["public"]["Enums"]["payment_method"]
          observaciones?: string | null
          referencia?: string
          updated_at?: string
          updated_by?: string | null
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          apellidos: string | null
          cargo: string | null
          created_at: string
          deleted_at: string | null
          departamento: string | null
          email: string | null
          estado: Database["public"]["Enums"]["record_status"]
          id: string
          idioma: string | null
          nombre: string | null
          telefono: string | null
          ultimo_acceso: string | null
          updated_at: string
          uuid: string
          zona_horaria: string | null
        }
        Insert: {
          apellidos?: string | null
          cargo?: string | null
          created_at?: string
          deleted_at?: string | null
          departamento?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["record_status"]
          id: string
          idioma?: string | null
          nombre?: string | null
          telefono?: string | null
          ultimo_acceso?: string | null
          updated_at?: string
          uuid?: string
          zona_horaria?: string | null
        }
        Update: {
          apellidos?: string | null
          cargo?: string | null
          created_at?: string
          deleted_at?: string | null
          departamento?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["record_status"]
          id?: string
          idioma?: string | null
          nombre?: string | null
          telefono?: string | null
          ultimo_acceso?: string | null
          updated_at?: string
          uuid?: string
          zona_horaria?: string | null
        }
        Relationships: []
      }
      purchase_invoices: {
        Row: {
          account_id: string | null
          base_imponible: number
          categoria: string | null
          concepto: string
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          estado: Database["public"]["Enums"]["purchase_status"]
          fecha_emision: string
          fecha_recepcion: string | null
          fecha_vencimiento: string | null
          id: string
          iva: number
          iva_pct: number
          moneda: string
          notas: string | null
          numero: string
          numero_proveedor: string | null
          pagado: number
          retencion: number
          supplier_id: string | null
          total: number
          updated_at: string
          updated_by: string | null
          uuid: string
        }
        Insert: {
          account_id?: string | null
          base_imponible?: number
          categoria?: string | null
          concepto: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          estado?: Database["public"]["Enums"]["purchase_status"]
          fecha_emision?: string
          fecha_recepcion?: string | null
          fecha_vencimiento?: string | null
          id?: string
          iva?: number
          iva_pct?: number
          moneda?: string
          notas?: string | null
          numero: string
          numero_proveedor?: string | null
          pagado?: number
          retencion?: number
          supplier_id?: string | null
          total?: number
          updated_at?: string
          updated_by?: string | null
          uuid?: string
        }
        Update: {
          account_id?: string | null
          base_imponible?: number
          categoria?: string | null
          concepto?: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          estado?: Database["public"]["Enums"]["purchase_status"]
          fecha_emision?: string
          fecha_recepcion?: string | null
          fecha_vencimiento?: string | null
          id?: string
          iva?: number
          iva_pct?: number
          moneda?: string
          notas?: string | null
          numero?: string
          numero_proveedor?: string | null
          pagado?: number
          retencion?: number
          supplier_id?: string | null
          total?: number
          updated_at?: string
          updated_by?: string | null
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoices_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payments: {
        Row: {
          conciliado: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          estado: Database["public"]["Enums"]["payment_status"]
          fecha_conciliacion: string | null
          fecha_devolucion: string | null
          fecha_pago: string | null
          fecha_prevista: string | null
          id: string
          importe: number
          metodo: Database["public"]["Enums"]["payment_method"]
          observaciones: string | null
          purchase_invoice_id: string | null
          referencia: string
          supplier_id: string | null
          updated_at: string
          updated_by: string | null
          uuid: string
        }
        Insert: {
          conciliado?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          estado?: Database["public"]["Enums"]["payment_status"]
          fecha_conciliacion?: string | null
          fecha_devolucion?: string | null
          fecha_pago?: string | null
          fecha_prevista?: string | null
          id?: string
          importe?: number
          metodo?: Database["public"]["Enums"]["payment_method"]
          observaciones?: string | null
          purchase_invoice_id?: string | null
          referencia: string
          supplier_id?: string | null
          updated_at?: string
          updated_by?: string | null
          uuid?: string
        }
        Update: {
          conciliado?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          estado?: Database["public"]["Enums"]["payment_status"]
          fecha_conciliacion?: string | null
          fecha_devolucion?: string | null
          fecha_pago?: string | null
          fecha_prevista?: string | null
          id?: string
          importe?: number
          metodo?: Database["public"]["Enums"]["payment_method"]
          observaciones?: string | null
          purchase_invoice_id?: string | null
          referencia?: string
          supplier_id?: string | null
          updated_at?: string
          updated_by?: string | null
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_purchase_invoice_id_fkey"
            columns: ["purchase_invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          categoria: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          direccion: string | null
          email: string | null
          estado: Database["public"]["Enums"]["record_status"]
          id: string
          nif: string | null
          nombre_comercial: string | null
          observaciones: string | null
          razon_social: string
          telefono: string | null
          updated_at: string
          updated_by: string | null
          uuid: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          direccion?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["record_status"]
          id?: string
          nif?: string | null
          nombre_comercial?: string | null
          observaciones?: string | null
          razon_social: string
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
          uuid?: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          direccion?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["record_status"]
          id?: string
          nif?: string | null
          nombre_comercial?: string | null
          observaciones?: string | null
          razon_social?: string
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
          uuid?: string
        }
        Relationships: []
      }
      ticket_comments: {
        Row: {
          autor_id: string | null
          autor_nombre: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          interno: boolean
          mensaje: string
          ticket_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          autor_id?: string | null
          autor_nombre?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          interno?: boolean
          mensaje: string
          ticket_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          autor_id?: string | null
          autor_nombre?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          interno?: boolean
          mensaje?: string
          ticket_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          application_id: string | null
          asignado_a: string | null
          asunto: string
          categoria: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          descripcion: string | null
          estado: Database["public"]["Enums"]["ticket_status"]
          fecha_apertura: string
          fecha_cierre: string | null
          id: string
          prioridad: Database["public"]["Enums"]["ticket_priority"]
          referencia: string
          updated_at: string
          updated_by: string | null
          uuid: string
        }
        Insert: {
          application_id?: string | null
          asignado_a?: string | null
          asunto: string
          categoria?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["ticket_status"]
          fecha_apertura?: string
          fecha_cierre?: string | null
          id?: string
          prioridad?: Database["public"]["Enums"]["ticket_priority"]
          referencia: string
          updated_at?: string
          updated_by?: string | null
          uuid?: string
        }
        Update: {
          application_id?: string | null
          asignado_a?: string | null
          asunto?: string
          categoria?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["ticket_status"]
          fecha_apertura?: string
          fecha_cierre?: string | null
          id?: string
          prioridad?: Database["public"]["Enums"]["ticket_priority"]
          referencia?: string
          updated_at?: string
          updated_by?: string | null
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accounting_account: { Args: { _id: string }; Returns: string }
      accounting_reverse: { Args: { _entry: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      sync_accounting_movement: {
        Args: { _id: string; _table: string }
        Returns: string
      }
    }
    Enums: {
      account_kind: "activo" | "pasivo" | "patrimonio" | "ingreso" | "gasto"
      app_role:
        | "administrador_general"
        | "administrador_comercial"
        | "administrador_financiero"
        | "administrador_tecnico"
        | "soporte"
        | "cliente_admin"
        | "usuario_cliente"
      billing_period:
        | "mensual"
        | "trimestral"
        | "semestral"
        | "anual"
        | "puntual"
      doc_type:
        | "contrato"
        | "factura"
        | "presupuesto"
        | "licencia"
        | "documentacion"
        | "imagen"
        | "email"
        | "otro"
      invoice_status:
        | "borrador"
        | "emitida"
        | "enviada"
        | "pagada"
        | "parcial"
        | "vencida"
        | "anulada"
      invoice_type: "ordinaria" | "rectificativa" | "abono" | "nota_credito"
      payment_method:
        | "transferencia"
        | "tarjeta"
        | "sepa"
        | "paypal"
        | "stripe"
        | "domiciliacion"
      payment_status:
        | "pendiente"
        | "cobrado"
        | "devuelto"
        | "cancelado"
        | "impagado"
      purchase_status:
        | "borrador"
        | "recibida"
        | "aprobada"
        | "contabilizada"
        | "pagada"
        | "parcial"
        | "anulada"
      record_status: "activo" | "inactivo" | "borrador" | "archivado"
      ticket_priority: "baja" | "media" | "alta" | "critica"
      ticket_status:
        | "abierto"
        | "en_progreso"
        | "pendiente"
        | "resuelto"
        | "cerrado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_kind: ["activo", "pasivo", "patrimonio", "ingreso", "gasto"],
      app_role: [
        "administrador_general",
        "administrador_comercial",
        "administrador_financiero",
        "administrador_tecnico",
        "soporte",
        "cliente_admin",
        "usuario_cliente",
      ],
      billing_period: [
        "mensual",
        "trimestral",
        "semestral",
        "anual",
        "puntual",
      ],
      doc_type: [
        "contrato",
        "factura",
        "presupuesto",
        "licencia",
        "documentacion",
        "imagen",
        "email",
        "otro",
      ],
      invoice_status: [
        "borrador",
        "emitida",
        "enviada",
        "pagada",
        "parcial",
        "vencida",
        "anulada",
      ],
      invoice_type: ["ordinaria", "rectificativa", "abono", "nota_credito"],
      payment_method: [
        "transferencia",
        "tarjeta",
        "sepa",
        "paypal",
        "stripe",
        "domiciliacion",
      ],
      payment_status: [
        "pendiente",
        "cobrado",
        "devuelto",
        "cancelado",
        "impagado",
      ],
      purchase_status: [
        "borrador",
        "recibida",
        "aprobada",
        "contabilizada",
        "pagada",
        "parcial",
        "anulada",
      ],
      record_status: ["activo", "inactivo", "borrador", "archivado"],
      ticket_priority: ["baja", "media", "alta", "critica"],
      ticket_status: [
        "abierto",
        "en_progreso",
        "pendiente",
        "resuelto",
        "cerrado",
      ],
    },
  },
} as const
