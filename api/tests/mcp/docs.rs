//! Documentation Tool Tests — doc_list, doc_read
//!
//! These tools serve T3000 product documentation. They require no database.

use crate::mcp::common;

// ═══ Tool existence ═══
#[test]
fn test_doc_tools_exist() {
    assert!(common::all_tools().iter().any(|t| t.name == "t3000_doc_list"));
    assert!(common::all_tools().iter().any(|t| t.name == "t3000_doc_read"));
}

// ═══ t3000_doc_list ═══
#[test]
fn test_doc_list_no_required_params() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_doc_list")
        .unwrap();
    let required = tool.input_schema.get("required");
    assert!(required.is_none() || required.unwrap().as_array().map_or(true, |a| a.is_empty()),
        "doc_list should have no required params");
}

#[test]
fn test_doc_list_empty_properties() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_doc_list")
        .unwrap();
    // doc_list takes no params, so properties should be empty
    let props = tool.input_schema.get("properties").and_then(|v| v.as_object());
    assert!(props.is_some());
    assert!(props.unwrap().is_empty(), "doc_list should have empty properties");
}

// ═══ t3000_doc_read ═══
#[test]
fn test_doc_read_requires_path() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_doc_read")
        .unwrap();
    let required: Vec<&str> = tool.input_schema
        .get("required")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    assert!(required.contains(&"path"), "doc_read must require 'path'");
    assert_eq!(required.len(), 1, "doc_read should only require 'path'");
}

#[test]
fn test_doc_read_path_is_string() {
    let tool = common::all_tools()
        .iter()
        .find(|t| t.name == "t3000_doc_read")
        .unwrap();
    let path_type = tool.input_schema
        .get("properties")
        .and_then(|v| v.get("path"))
        .and_then(|v| v.get("type"))
        .and_then(|v| v.as_str());
    assert_eq!(path_type, Some("string"), "path must be string type");
}

// ═══ Live calls (the doc server must be running) ═══
#[tokio::test]
async fn test_doc_list_returns_sections() {
    common::with_db_or_skip("doc_list_returns_sections", |db| async move {
        let result = match common::execute_tool_json("t3000_doc_list", &serde_json::json!({}), &db).await {
            Ok(result) => result,
            Err(e) => {
                println!("doc server unavailable — skipping: {}", e);
                return;
            }
        };

        let sections = result.get("sections").and_then(|v| v.as_array()).cloned().unwrap_or_default();
        assert!(!sections.is_empty(), "doc_list must return sections: {}", result);
        assert_eq!(common::get_i64(&result, "total_sections").unwrap_or(-1) as usize, sections.len(),
            "total_sections must match the sections array");

        let mut items = 0;
        for section in &sections {
            assert!(common::get_str(section, "section").map(|s| !s.is_empty()).unwrap_or(false),
                "every section needs a name: {}", section);
            let entries = section.get("items").and_then(|v| v.as_array()).cloned().unwrap_or_default();
            assert_eq!(section.get("count").and_then(|v| v.as_i64()).unwrap_or(-1) as usize, entries.len(),
                "section count must match its items: {}", section);
            for item in &entries {
                assert!(common::get_str(item, "path").map(|p| !p.is_empty()).unwrap_or(false),
                    "every doc entry needs a path: {}", item);
                assert!(common::get_str(item, "title").map(|t| !t.is_empty()).unwrap_or(false),
                    "every doc entry needs a title: {}", item);
                items += 1;
            }
        }
        assert!(items > 0, "the doc index must list at least one page");
    })
    .await;
}

#[tokio::test]
async fn test_doc_read_returns_the_page_named_by_doc_list() {
    common::with_db_or_skip("doc_read_returns_page", |db| async move {
        let index = match common::execute_tool_json("t3000_doc_list", &serde_json::json!({}), &db).await {
            Ok(result) => result,
            Err(e) => {
                println!("doc server unavailable — skipping: {}", e);
                return;
            }
        };

        // Read the first page the index advertises — that is the contract.
        let path = index["sections"]
            .as_array()
            .and_then(|s| s.first())
            .and_then(|s| s.get("items"))
            .and_then(|i| i.as_array())
            .and_then(|i| i.first())
            .and_then(|i| common::get_str(i, "path"))
            .expect("the index must advertise a page")
            .to_string();

        let result = common::execute_tool_json(
            "t3000_doc_read",
            &serde_json::json!({"path": path}),
            &db,
        )
        .await
        .expect("reading a page from the index must succeed");

        let content = common::get_str(&result, "content").unwrap_or_default();
        assert!(content.len() > 100,
            "doc_read for '{}' returned no usable content: {}", path, result);

        // An unknown page must be an error, not an empty document.
        let err = common::execute_tool_json(
            "t3000_doc_read",
            &serde_json::json!({"path": "definitely-not-a-page"}),
            &db,
        )
        .await
        .expect_err("an unknown doc path must be an error");
        assert!(err.to_lowercase().contains("not found"), "got: {}", err);
    })
    .await;
}

// ??? Report doc tools (share the on-disk markdown index) ???

#[tokio::test]
async fn test_report_docs_search_explains_an_empty_index() {
    common::with_db_or_skip("report_docs_search_empty_index", |db| async move {
        let result = common::execute_tool_json(
            "t3000_report_docs_search",
            &serde_json::json!({"query": "trendlog", "limit": 5}),
            &db,
        )
        .await
        .expect("report_docs_search should succeed");

        let total_docs = common::get_i64(&result, "total_docs")
            .expect("total_docs must be reported");
        assert!(result.get("results").is_some(), "results array must be present: {}", result);
        if total_docs == 0 {
            // "0 results" alone is ambiguous ? the tool must say the docs are missing.
            let note = common::get_str(&result, "note").unwrap_or_default();
            assert!(note.to_lowercase().contains("documentation"),
                "an empty index must be explained: {}", result);
        }

        let err = common::execute_tool_json("t3000_report_docs_search", &serde_json::json!({}), &db)
            .await
            .expect_err("query is required");
        assert!(err.to_lowercase().contains("query"), "got: {}", err);
    })
    .await;
}

#[tokio::test]
async fn test_report_self_check_flags_an_unsearched_index() {
    common::with_db_or_skip("report_self_check_shape", |db| async move {
        let result = common::execute_tool_json(
            "t3000_report_self_check",
            &serde_json::json!({"message": "inputs do not load", "area": "Inputs"}),
            &db,
        )
        .await
        .expect("self_check should succeed");

        assert!(result.get("suggestions").is_some(), "suggestions must be present: {}", result);
        let searched = common::get_i64(&result, "documents_searched")
            .expect("documents_searched must be reported");
        // "documented" must not claim coverage that was never checked.
        assert_eq!(
            result.get("documented").and_then(|v| v.as_bool()),
            Some(searched > 0 && common::array_len(&result, "suggestions") > 0),
            "documented must be false when no documents were searched: {}", result
        );

        let err = common::execute_tool_json("t3000_report_self_check", &serde_json::json!({}), &db)
            .await
            .expect_err("message is required");
        assert!(err.to_lowercase().contains("message"), "got: {}", err);
    })
    .await;
}
