package chroma

import (
	"context"
	"log"

	v2 "github.com/amikos-tech/chroma-go/pkg/api/v2"
	"launchcircle-backend/internal/config"
)

var Client v2.Client
var CasesCollection v2.Collection

func Init() error {
	client, err := v2.NewHTTPClient(v2.WithBaseURL(config.AppConfig.ChromaURL))
	if err != nil {
		return err
	}

	Client = client

	err = client.Heartbeat(context.Background())
	if err != nil {
		return err
	}

	collections, err := client.ListCollections(context.Background())
	if err != nil {
		return err
	}

	var caseCol v2.Collection
	found := false
	for _, col := range collections {
		if col.Name() == "launch_cases" {
			caseCol = col
			found = true
			break
		}
	}

	if !found {
		caseCol, err = client.CreateCollection(
			context.Background(),
			"launch_cases",
			v2.WithIfNotExistsCreate(),
		)
		if err != nil {
			return err
		}
		log.Println("创建了新的案例集合")
	}

	CasesCollection = caseCol
	log.Println("Chroma客户端初始化完成")
	return nil
}

func AddCase(ctx context.Context, id, content string, metadata map[string]interface{}) error {
	meta := v2.NewMetadata()
	for k, v := range metadata {
		meta.SetRaw(k, v)
	}

	err := CasesCollection.Add(
		ctx,
		v2.WithIDs(v2.DocumentID(id)),
		v2.WithTexts(content),
		v2.WithMetadatas(meta),
	)
	return err
}

type QueryResult struct {
	Document  string
	Metadata  map[string]interface{}
	Distance  float32
}

func SearchSimilarCases(ctx context.Context, query string, nResults int) ([]QueryResult, error) {
	results, err := CasesCollection.Query(
		ctx,
		v2.WithQueryTexts(query),
		v2.WithNResults(nResults),
		v2.WithInclude("documents", "metadatas", "distances"),
	)
	if err != nil {
		return nil, err
	}

	var queryResults []QueryResult
	groups := results.CountGroups()
	for i := 0; i < groups; i++ {
		qr := QueryResult{
			Metadata: make(map[string]interface{}),
		}

		docGroups := results.GetDocumentsGroups()
		if i < len(docGroups) && len(docGroups[i]) > 0 {
			qr.Document = docGroups[i][0].ContentString()
		}

		distGroups := results.GetDistancesGroups()
		if i < len(distGroups) && len(distGroups[i]) > 0 {
			qr.Distance = float32(distGroups[i][0])
		}

		queryResults = append(queryResults, qr)
	}
	return queryResults, nil
}
