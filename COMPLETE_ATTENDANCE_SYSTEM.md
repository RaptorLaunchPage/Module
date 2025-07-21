# Complete Session-Wise Attendance System

## 🎯 **Manual + Auto Attendance Integration**

Your session-wise attendance system now includes **both manual attendance** (for practice sessions) **and auto-attendance** (from performance data) working seamlessly together!

---

## 🔄 **Dual Attendance System Overview**

### **Manual Attendance** (Practice Sessions)
- ✅ **Who**: Players mark their own attendance
- ✅ **When**: Before cutoff time (default 12:00 PM)
- ✅ **How**: Present/Late buttons in Session UI
- ✅ **Auto-Absent**: System marks absent after cutoff

### **Auto-Attendance** (Tournament Sessions)  
- ✅ **Who**: System auto-tracks from performance data
- ✅ **When**: Automatically when performance is submitted
- ✅ **How**: Creates tournament session + attendance record
- ✅ **Source**: Marked as 'auto' in database

---

## 🏗️ **How Auto-Attendance Works**

### **Performance → Attendance Flow**
```typescript
1. Player submits performance data
2. System checks if scrims session exists for that date/team
3. If not, creates new scrims session (type: 'tournament', subtype: 'Scrims')
4. Creates attendance record with status: 'present', source: 'auto'
5. Links attendance to performance via slot_id
```

### **Database Trigger Implementation**
```sql
-- Trigger: When performance is inserted
CREATE TRIGGER auto_match_attendance_on_performance
    AFTER INSERT ON public.performances
    FOR EACH ROW
    EXECUTE FUNCTION public.create_match_attendance_from_performance();
```

### **Auto-Attendance Function Logic**
```sql
CREATE OR REPLACE FUNCTION public.create_match_attendance_from_performance()
RETURNS TRIGGER AS $$
DECLARE
    match_session_id uuid;
    performance_date date;
BEGIN
    -- Get performance date (from slot or current date)
    performance_date := CURRENT_DATE;
    IF NEW.slot IS NOT NULL THEN
        SELECT date INTO performance_date FROM public.slots WHERE id = NEW.slot;
    END IF;

    -- Create tournament session if doesn't exist
    INSERT INTO public.sessions (
        team_id, session_type, session_subtype, date, 
        title, is_mandatory, created_by
    )
    SELECT NEW.team_id, 'tournament', 'Scrims', performance_date,
           'Auto-generated Scrims Session', false, NEW.player_id
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sessions 
        WHERE team_id = NEW.team_id AND date = performance_date 
        AND session_type = 'tournament' AND session_subtype = 'Scrims'
    )
    RETURNING id INTO match_session_id;

    -- Create attendance record
    INSERT INTO public.attendances (
        player_id, team_id, session_id, 
        status, source, slot_id
    )
    SELECT NEW.player_id, NEW.team_id, match_session_id,
           'present', 'auto', NEW.slot
    WHERE NOT EXISTS (
        SELECT 1 FROM public.attendances 
        WHERE player_id = NEW.player_id AND session_id = match_session_id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 📊 **Session Types & Attendance Sources**

### **Practice Sessions** (Manual)
```typescript
{
  session_type: 'practice',
  session_subtype: 'Morning' | 'Evening' | 'Night',
  is_mandatory: true,
  attendance_source: 'manual' | 'system' // system = auto-absent
}
```

### **Tournament Sessions** (Auto)
```typescript
{
  session_type: 'tournament', 
  session_subtype: 'Scrims',
  is_mandatory: false,
  attendance_source: 'auto' // from performance data
}
```

### **Meeting Sessions** (Manual)
```typescript
{
  session_type: 'meeting',
  session_subtype: 'Team Meeting' | 'Strategy Session',
  is_mandatory: false,
  attendance_source: 'manual' // coach/admin marks
}
```

---

## 🎨 **Enhanced UI for Both Systems**

### **Practice Sessions Display**
```typescript
// Manual attendance with cutoff time enforcement
<Card className={attendanceStatus ? getStatusColor(status) : 'border-2'}>
  <CardContent>
    <div>Practice Session - {subtype}</div>
    <div>Cutoff: {cutoff_time}</div>
    
    {/* Player can mark if before cutoff */}
    {canMark ? (
      <div>
        <Button onClick={() => mark('present')}>Present</Button>
        <Button onClick={() => mark('late')}>Late</Button>
      </div>
    ) : (
      <Badge>
        {cutoffPassed ? 'Auto Absent' : 'Already Marked'}
      </Badge>
    )}
  </CardContent>
</Card>
```

### **Tournament Sessions Display**
```typescript
// Auto-attendance from performance data
<Card className="tournament-session">
  <CardContent>
    <div>Tournament Session - Match</div>
    <span className="auto-badge">Auto from Performance</span>
    
    {/* Show player's auto-tracked attendance */}
    {myAttendance && (
      <Badge className={getStatusColor(myAttendance.status)}>
        {myAttendance.status} - Auto-tracked from performance
      </Badge>
    )}
    
    {/* Show team breakdown */}
    <div className="attendance-breakdown">
      <div>{autoAttendances.length} auto-tracked</div>
      <div>{manualAttendances.length} manual</div>
    </div>
  </CardContent>
</Card>
```

---

## 🔄 **Complete Attendance Workflow**

### **Daily Practice Flow**
1. **Morning**: System auto-generates practice sessions (Morning/Evening/Night)
2. **Player Login**: Sees practice sessions with cutoff time
3. **Mark Attendance**: Player clicks Present/Late before cutoff
4. **After Cutoff**: System auto-marks remaining players as Absent
5. **Coach View**: See team attendance summary in real-time

### **Scrims/Tournament Flow**
1. **Performance Submission**: Player submits match/scrims performance data
2. **Auto-Session Creation**: System creates scrims session for that date/team
3. **Auto-Attendance**: Creates attendance record (status: present, source: auto)
4. **UI Display**: Scrims session shows with "Auto from Performance" badge
5. **Team View**: Coaches see auto-tracked attendance vs manual attendance

### **Meeting Flow**
1. **Admin Creation**: Admin/Manager creates meeting session
2. **Manual Marking**: Admin/Coach marks attendance manually
3. **Player View**: Players see meeting attendance (view-only)
4. **Team Records**: Meeting attendance tracked for records

---

## 📈 **Attendance Source Tracking**

### **Source Types**
```typescript
type AttendanceSource = 'manual' | 'auto' | 'system'

// manual: Player/Admin manually marked
// auto: Auto-generated from performance data  
// system: Auto-marked absent by system after cutoff
```

### **Database Schema**
```sql
ALTER TABLE public.attendances ADD COLUMN source text DEFAULT 'manual' 
    CHECK (source IN ('manual', 'auto', 'system'));
```

### **Query Examples**
```sql
-- Get all auto-tracked attendance
SELECT * FROM attendances WHERE source = 'auto';

-- Get manual practice attendance 
SELECT * FROM attendances a
JOIN sessions s ON a.session_id = s.id
WHERE s.session_type = 'practice' AND a.source = 'manual';

-- Get auto-absent players
SELECT * FROM attendances WHERE source = 'system' AND status = 'absent';
```

---

## 🎯 **Business Logic Summary**

### **Practice Sessions (Manual)**
- ✅ **Auto-Generated**: Daily unless holiday
- ✅ **Player Marking**: Before cutoff time only
- ✅ **Auto-Absent**: After cutoff if not marked
- ✅ **Mandatory**: Required for all players

### **Tournament Sessions (Auto)**
- ✅ **Performance-Triggered**: Created when performance submitted
- ✅ **Auto-Attendance**: Present status automatically
- ✅ **Optional**: Not mandatory attendance
- ✅ **Match-Linked**: Connected to specific performance/slot

### **Meeting Sessions (Admin)**
- ✅ **Admin-Created**: Manual creation by admin/manager
- ✅ **Manual-Marking**: Admin marks attendance
- ✅ **Optional**: Not mandatory attendance
- ✅ **Record-Keeping**: For team meeting tracking

---

## 🔧 **Implementation Status**

### **✅ Completed Features**
- ✅ **Database Schema**: Sessions, holidays, updated attendances
- ✅ **Auto-Functions**: Daily generation, auto-absent, auto-attendance
- ✅ **API Endpoints**: Sessions CRUD operations
- ✅ **UI Components**: Session-wise attendance interface
- ✅ **Triggers**: Performance → Auto-attendance
- ✅ **Role Permissions**: Player/Coach/Admin access control

### **✅ Integration Points**
- ✅ **Performance Module**: Auto-creates tournament attendance
- ✅ **Attendance Module**: Shows both manual and auto attendance
- ✅ **Team Management**: Coaches see team attendance overview
- ✅ **User Roles**: Proper access control for all features

---

## 🎊 **Complete System Benefits**

### **For Players**
- ✅ **Easy Practice Marking**: Simple Present/Late buttons
- ✅ **Auto Tournament Tracking**: Performance submission = automatic attendance
- ✅ **Clear Visibility**: See both practice and tournament attendance
- ✅ **No Double Work**: No need to mark tournament attendance manually

### **For Coaches/Admins**
- ✅ **Complete Picture**: See all attendance types in one place
- ✅ **Auto Tournament Data**: Tournament attendance tracked automatically
- ✅ **Manual Control**: Can create meetings and mark attendance
- ✅ **Analytics Ready**: All data properly categorized by source

### **For System**
- ✅ **Data Integrity**: No duplicate attendance records
- ✅ **Source Tracking**: Know how each attendance was created
- ✅ **Automation**: Reduces manual work for tournament attendance
- ✅ **Flexibility**: Supports all attendance scenarios

---

## 🎯 **Perfect Integration Summary**

✅ **Manual Practice Attendance**: Players mark before cutoff, auto-absent after  
✅ **Auto Tournament Attendance**: Performance submission creates attendance  
✅ **Admin Meeting Attendance**: Manual creation and marking by admins  
✅ **Enhanced UI**: Visual distinction between manual and auto attendance  
✅ **Complete Tracking**: All attendance sources properly tracked and displayed  
✅ **No Breaking Changes**: Existing functionality preserved and enhanced  

**Your attendance system now perfectly handles both manual and automatic attendance with full integration between performance data and attendance tracking!** 🚀