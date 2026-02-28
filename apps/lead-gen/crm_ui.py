import streamlit as st
import sqlite3
import pandas as pd
import json
from datetime import datetime
from pathlib import Path

st.set_page_config(
    page_title="B2B Lead Management CRM",
    page_icon="📊",
    layout="wide"
)

DB_PATH = "data/leads.db"

def get_connection():
    return sqlite3.connect(DB_PATH)

def get_leads_df():
    conn = get_connection()
    df = pd.read_sql_query("SELECT * FROM leads", conn)
    conn.close()
    return df

def update_lead_status(lead_id, status):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE leads SET status = ?, updated_at = ? WHERE id = ?", 
                   (status, datetime.now().isoformat(), lead_id))
    conn.commit()
    conn.close()

def update_whatsapp_status(lead_id, wa_status):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE leads SET whatsapp_status = ?, updated_at = ? WHERE id = ?", 
                   (wa_status, datetime.now().isoformat(), lead_id))
    conn.commit()
    conn.close()

def add_note(lead_id, note):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT notes FROM leads WHERE id = ?", (lead_id,))
    row = cursor.fetchone()
    notes = json.loads(row[0]) if row and row[0] else []
    notes.append(f"{datetime.now().strftime('%Y-%m-%d %H:%M')}: {note}")
    cursor.execute("UPDATE leads SET notes = ?, updated_at = ? WHERE id = ?",
                   (json.dumps(notes), datetime.now().isoformat(), lead_id))
    conn.commit()
    conn.close()

st.title("📊 B2B Lead Management CRM")
st.markdown("---")

df = get_leads_df()

col1, col2, col3, col4, col5 = st.columns(5)
with col1:
    st.metric("Total Leads", len(df))
with col2:
    st.metric("With Phone", len(df[df['phone'].notna() & (df['phone'] != '')]))
with col3:
    st.metric("New", len(df[df['status'] == 'new']))
with col4:
    wa_registered = len(df[df['whatsapp_status'] == 'registered']) if 'whatsapp_status' in df.columns else 0
    st.metric("WhatsApp ✓", wa_registered)
with col5:
    st.metric("Contacted", len(df[df['status'] == 'contacted']))

st.markdown("---")

tab1, tab2, tab3, tab4 = st.tabs(["📋 All Leads", "🎯 Quality Filter", "📱 WhatsApp Ready", "📈 Statistics"])

with tab1:
    st.subheader("All Leads")
    
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        country_filter = st.multiselect("Country", df['country'].unique().tolist(), default=df['country'].unique().tolist())
    with col2:
        status_filter = st.multiselect("Status", df['status'].unique().tolist(), default=df['status'].unique().tolist())
    with col3:
        wa_options = ['all', 'registered', 'not_registered', 'unknown']
        wa_filter = st.selectbox("WhatsApp Status", wa_options)
    with col4:
        search = st.text_input("Search by name/phone")
    
    filtered_df = df[df['country'].isin(country_filter) & df['status'].isin(status_filter)]
    
    if 'whatsapp_status' in filtered_df.columns and wa_filter != 'all':
        filtered_df = filtered_df[filtered_df['whatsapp_status'] == wa_filter]
    
    if search:
        filtered_df = filtered_df[filtered_df['name'].str.contains(search, case=False, na=False) | 
                                   filtered_df['phone'].str.contains(search, case=False, na=False)]
    
    display_cols = ['name', 'phone', 'country', 'status', 'rating', 'whatsapp_status', 'website']
    display_cols = [c for c in display_cols if c in filtered_df.columns]
    st.dataframe(filtered_df[display_cols], use_container_width=True, hide_index=True)
    
    st.markdown("### Update Lead")
    col1, col2, col3 = st.columns(3)
    with col1:
        selected_id = st.selectbox("Select Lead", filtered_df['id'].tolist(), 
                                   format_func=lambda x: filtered_df[filtered_df['id']==x]['name'].values[0])
    with col2:
        new_status = st.selectbox("Lead Status", ['new', 'contacted', 'follow_up_1', 'follow_up_2', 
                                                  'responded', 'interested', 'sample_requested', 
                                                  'converted', 'rejected', 'do_not_contact'])
    with col3:
        wa_status = st.selectbox("WhatsApp Status", ['unknown', 'registered', 'not_registered'])
    
    if st.button("Update"):
        update_lead_status(selected_id, new_status)
        update_whatsapp_status(selected_id, wa_status)
        st.success(f"Updated: {new_status}, WhatsApp: {wa_status}")
        st.rerun()

with tab2:
    st.subheader("Quality Leads Filter")
    st.markdown("Filter by: Phone exists + Rating >= 4.0")
    
    quality_df = df[
        df['phone'].notna() & 
        (df['phone'] != '') & 
        (df['rating'] >= 4.0)
    ].copy()
    
    st.metric("Quality Leads", len(quality_df))
    
    col1, col2 = st.columns(2)
    with col1:
        min_rating = st.slider("Min Rating", 0.0, 5.0, 4.0, 0.1)
    with col2:
        countries = st.multiselect("Countries", quality_df['country'].unique().tolist(), 
                                   default=quality_df['country'].unique().tolist())
    
    quality_df = quality_df[quality_df['rating'] >= min_rating]
    quality_df = quality_df[quality_df['country'].isin(countries)]
    
    display_cols = ['name', 'phone', 'rating', 'country', 'status', 'whatsapp_status']
    display_cols = [c for c in display_cols if c in quality_df.columns]
    st.dataframe(quality_df[display_cols], use_container_width=True, hide_index=True)
    
    csv = quality_df.to_csv(index=False)
    st.download_button("📥 Download CSV", csv, "quality_leads.csv", "text/csv")

with tab3:
    st.subheader("📱 WhatsApp Ready Contacts")
    st.markdown("Leads with WhatsApp registered - ready to contact!")
    
    if 'whatsapp_status' in df.columns:
        wa_df = df[df['whatsapp_status'] == 'registered'].copy()
        
        st.metric("WhatsApp Registered", len(wa_df))
        
        if len(wa_df) > 0:
            col1, col2 = st.columns(2)
            with col1:
                country_filter = st.multiselect("Filter by Country", wa_df['country'].unique().tolist(), 
                                               default=wa_df['country'].unique().tolist(), key="wa_country")
            with col2:
                status_filter = st.multiselect("Filter by Status", wa_df['status'].unique().tolist(),
                                              default=['new'], key="wa_status")
            
            wa_df = wa_df[wa_df['country'].isin(country_filter) & wa_df['status'].isin(status_filter)]
            
            st.dataframe(wa_df[['name', 'phone', 'country', 'status', 'rating']], 
                        use_container_width=True, hide_index=True)
            
            csv = wa_df.to_csv(index=False)
            st.download_button("📥 Download WhatsApp Contacts", csv, "whatsapp_contacts.csv", "text/csv")
        else:
            st.info("No WhatsApp registered contacts yet. Use the export function to check which numbers have WhatsApp.")
    else:
        st.info("WhatsApp status not available. Run whatsapp_tools.py to detect WhatsApp numbers.")
    
    st.markdown("---")
    st.markdown("### 📲 How to detect WhatsApp numbers")
    st.markdown("""
    1. **Export contacts**: Run `python whatsapp_tools.py export`
    2. **Transfer to phone**: Copy `output/contacts.vcf` to your phone
    3. **Import contacts**: Open Contacts app → Import from VCF
    4. **Check WhatsApp**: Open WhatsApp → New Chat → See which numbers appear
    5. **Update status**: Mark numbers as 'registered' in this CRM
    """)

with tab4:
    st.subheader("Statistics")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### Leads by Status")
        status_counts = df['status'].value_counts()
        st.bar_chart(status_counts)
    
    with col2:
        st.markdown("#### Leads by Country")
        country_counts = df['country'].value_counts()
        st.bar_chart(country_counts)
    
    if 'whatsapp_status' in df.columns:
        st.markdown("#### WhatsApp Detection Progress")
        wa_counts = df['whatsapp_status'].value_counts()
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Registered", wa_counts.get('registered', 0))
        with col2:
            st.metric("Not Registered", wa_counts.get('not_registered', 0))
        with col3:
            st.metric("Unknown", wa_counts.get('unknown', len(df)))
    
    st.markdown("#### Rating Distribution")
    st.hist(df['rating'].dropna(), bins=20)

st.markdown("---")
st.markdown("*B2B Lead Management CRM - Powered by Streamlit*")
