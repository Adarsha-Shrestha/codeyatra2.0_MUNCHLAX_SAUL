import os
from config.database import db_client
from analytics_orchestrator import AnalyticsOrchestrator
from generation.prompts import AnalyticType

def setup_test_data():
    client_db = db_client.get_client_db()
    
    # Check if we already have test data
    existing = client_db.get(where={"client_case_id": "TEST-001"})
    if existing and existing["ids"]:
        print("Test data already exists.")
        return
        
    print("Inserting test data into client_db...")
    client_db.add(
        documents=["The client, John Doe, was involved in a traffic collision on 2023-10-01 at Main St. He suffered a broken arm and missed 3 weeks of work. The other driver ran a red light. John has not yet filed a lawsuit, but the 2-year statute of limitations is approaching."],
        metadatas=[{"client_case_id": "TEST-001", "client_name": "John Doe"}],
        ids=["client_doc_1"]
    )
    
    # We could also add some mock law/cases if the dbs are empty, but the orchestrator should handle it gracefully if not
    
def run_test():
    setup_test_data()
    
    print("\n--- Testing AnalyticsOrchestrator ---")
    
    result = AnalyticsOrchestrator.generate_analytics(
        client_case_id="TEST-001",
        analytic_type=AnalyticType.COMPLIANCE_TRACKER.value
    )
    
    print("\nResult:")
    print("Type:", result.get("analytic_type"))
    print("Case ID:", result.get("client_case_id"))
    print("Sources:", result.get("sources"))
    print("\nReport Output:")
    print(result.get("report"))

if __name__ == "__main__":
    run_test()
