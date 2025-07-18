# Database Schema Analysis - Cross-Check with Application

## 🔍 **Schema vs Application Analysis**

### ✅ **Tables Present in Schema & Application**

| Table | Schema ✅ | TypeScript Types ✅ | Application Usage ✅ |
|-------|-----------|---------------------|---------------------|
| `users` | ✅ | ✅ | ✅ Heavy usage |
| `teams` | ✅ | ✅ | ✅ Heavy usage |
| `performances` | ✅ | ✅ | ✅ Heavy usage |
| `slots` | ✅ | ✅ | ✅ Heavy usage |
| `rosters` | ✅ | ✅ | ✅ Heavy usage |
| `slot_expenses` | ✅ | ✅ | ✅ Heavy usage |
| `prize_pools` | ✅ | ✅ | ✅ Heavy usage |
| `winnings` | ✅ | ✅ | ✅ Heavy usage |

### ⚠️ **Tables in Schema but NOT in TypeScript Types**

| Table | Schema | TypeScript Types | Application Usage | Issue |
|-------|--------|------------------|-------------------|-------|
| `admin_config` | ✅ | ❌ | ❌ | Missing types & unused |
| `module_permissions` | ✅ | ❌ | ❌ | Missing types & unused |
| `profiles` | ✅ | ❌ | ❌ | Missing types & unused |

### ⚠️ **Tables in TypeScript Types but NOT in Schema**

| Table | Schema | TypeScript Types | Application Usage | Issue |
|-------|--------|------------------|-------------------|-------|
| `tier_defaults` | ❌ | ✅ | ✅ | Missing from schema |

## 🚨 **Critical Field Mismatches**

### 1. **Users Table - Missing Fields in TypeScript Types**

**Schema has these fields that TypeScript types are missing:**
```sql
-- Fields in schema but NOT in TypeScript types:
contact_number text,
in_game_role text,
device_info text,
device_model text,
ram text,
fps text,
storage text,
status text DEFAULT 'Active'::text,
gyroscope_enabled boolean DEFAULT true,
instagram_handle text,
discord_id text,
```

**TypeScript types missing these fields:**
- `contact_number`
- `in_game_role`
- `device_info`
- `device_model`
- `ram`
- `fps`
- `storage`
- `status`
- `gyroscope_enabled`
- `instagram_handle`
- `discord_id`

### 2. **Users Table - Role Constraint Mismatch**

**Schema constraint:**
```sql
role text DEFAULT 'pending_player'::text CHECK (role = ANY (ARRAY['admin'::text, 'manager'::text, 'coach'::text, 'player'::text, 'analyst'::text, 'pending_player'::text, 'awaiting_approval'::text]))
```

**TypeScript types:**
```typescript
role: "admin" | "manager" | "coach" | "player" | "analyst" | "pending_player"
```

**❌ Missing from TypeScript:** `awaiting_approval`

### 3. **Performances Table - Slot Field Type Mismatch**

**Schema:**
```sql
slot uuid,
```

**TypeScript types:**
```typescript
slot: number
```

**❌ Type mismatch:** Schema has `uuid`, TypeScript has `number`

### 4. **Slots Table - Field Name Mismatch**

**Schema:**
```sql
match_count integer NOT NULL,
```

**TypeScript types:**
```typescript
match_count: number | null
```

**❌ Nullability mismatch:** Schema has `NOT NULL`, TypeScript has `| null`

## 🔧 **Required Fixes**

### 1. **Update TypeScript Types in `lib/supabase.ts`**

```typescript
// Fix users table types
users: {
  Row: {
    id: string
    email: string
    name: string | null
    role: "admin" | "manager" | "coach" | "player" | "analyst" | "pending_player" | "awaiting_approval"
    role_level: number | null
    team_id: string | null
    avatar_url: string | null
    created_at: string
    provider: string | null
    // ADD MISSING FIELDS:
    contact_number: string | null
    in_game_role: string | null
    device_info: string | null
    device_model: string | null
    ram: string | null
    fps: string | null
    storage: string | null
    status: string | null
    gyroscope_enabled: boolean | null
    instagram_handle: string | null
    discord_id: string | null
  }
  Insert: {
    id: string
    email: string
    name?: string | null
    role?: "admin" | "manager" | "coach" | "player" | "analyst" | "pending_player" | "awaiting_approval"
    role_level?: number | null
    team_id?: string | null
    avatar_url?: string | null
    provider?: string | null
    // ADD MISSING FIELDS:
    contact_number?: string | null
    in_game_role?: string | null
    device_info?: string | null
    device_model?: string | null
    ram?: string | null
    fps?: string | null
    storage?: string | null
    status?: string | null
    gyroscope_enabled?: boolean | null
    instagram_handle?: string | null
    discord_id?: string | null
  }
  Update: {
    name?: string | null
    role?: "admin" | "manager" | "coach" | "player" | "analyst" | "pending_player" | "awaiting_approval"
    role_level?: number | null
    team_id?: string | null
    avatar_url?: string | null
    provider?: string | null
    // ADD MISSING FIELDS:
    contact_number?: string | null
    in_game_role?: string | null
    device_info?: string | null
    device_model?: string | null
    ram?: string | null
    fps?: string | null
    storage?: string | null
    status?: string | null
    gyroscope_enabled?: boolean | null
    instagram_handle?: string | null
    discord_id?: string | null
  }
}

// Fix performances table slot field type
performances: {
  Row: {
    // ... other fields
    slot: string | null  // Changed from number to string (UUID)
  }
  Insert: {
    // ... other fields
    slot?: string | null  // Changed from number to string (UUID)
  }
  Update: {
    // ... other fields
    slot?: string | null  // Changed from number to string (UUID)
  }
}

// Fix slots table match_count nullability
slots: {
  Row: {
    // ... other fields
    match_count: number  // Changed from number | null to number
  }
  Insert: {
    // ... other fields
    match_count: number  // Changed from number | null to number
  }
  Update: {
    // ... other fields
    match_count?: number  // Changed from number | null to number
  }
}
```

### 2. **Add Missing Table Types**

```typescript
// Add missing tables to Database type
admin_config: {
  Row: {
    key: string
    value: string
  }
  Insert: {
    key: string
    value: string
  }
  Update: {
    key?: string
    value?: string
  }
}

module_permissions: {
  Row: {
    id: number
    role: string
    module: string
    can_access: boolean
  }
  Insert: {
    role: string
    module: string
    can_access?: boolean
  }
  Update: {
    role?: string
    module?: string
    can_access?: boolean
  }
}

profiles: {
  Row: {
    id: number
    user_id: string
    username: string | null
    avatar_url: string | null
    website: string | null
    created_at: string
    updated_at: string
  }
  Insert: {
    user_id: string
    username?: string | null
    avatar_url?: string | null
    website?: string | null
  }
  Update: {
    user_id?: string
    username?: string | null
    avatar_url?: string | null
    website?: string | null
    updated_at?: string
  }
}
```

### 3. **Remove Unused Table Types**

```typescript
// Remove tier_defaults table type (not in schema)
// tier_defaults: { ... } // REMOVE THIS
```

## 📊 **Application Usage Analysis**

### **Heavy Usage Tables:**
1. **users** - Profile management, authentication, role-based access
2. **teams** - Team management, roster assignments
3. **performances** - Performance tracking, statistics
4. **slots** - Tournament slot booking
5. **rosters** - Team roster management

### **Unused Tables:**
1. **admin_config** - Defined in schema but never used
2. **module_permissions** - Defined in schema but never used  
3. **profiles** - Defined in schema but never used (duplicate of users?)

### **Missing Tables:**
1. **tier_defaults** - Used in application but not in schema

## 🚀 **Recommended Actions**

### **Immediate Fixes (Critical):**
1. ✅ Update TypeScript types to match schema
2. ✅ Fix field type mismatches (slot: uuid vs number)
3. ✅ Add missing role: "awaiting_approval"
4. ✅ Add all missing user fields

### **Schema Cleanup (Optional):**
1. 🔄 Remove unused tables: `admin_config`, `module_permissions`, `profiles`
2. 🔄 Add missing table: `tier_defaults`
3. 🔄 Consider merging `profiles` functionality into `users` table

### **Application Impact:**
- **Profile page** - Currently failing due to missing field types
- **User management** - Missing role constraint causing issues
- **Performance tracking** - Slot field type mismatch
- **Team management** - Working correctly

## 🎯 **Priority Order:**
1. **HIGH**: Fix TypeScript types for users table
2. **HIGH**: Fix performances.slot field type
3. **MEDIUM**: Add missing table types
4. **LOW**: Clean up unused tables

This analysis shows that the application is mostly well-connected to the database, but there are critical TypeScript type mismatches that need immediate attention.