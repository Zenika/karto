package exposition

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"karto/types"
	"log"
	"net/http"
	"sync"
)

//go:embed frontend
var embeddedFrontend embed.FS

type handler struct {
	mutex              sync.RWMutex
	lastAnalysisResult types.AnalysisResult
}

func newHandler() *handler {
	handler := &handler{
		lastAnalysisResult: types.AnalysisResult{
			Pods:          []*types.Pod{},
			PodIsolations: []*types.PodIsolation{},
			AllowedRoutes: []*types.AllowedRoute{},
			Services:      []*types.Service{},
			Ingresses:     []*types.Ingress{},
			ReplicaSets:   []*types.ReplicaSet{},
			StatefulSets:  []*types.StatefulSet{},
			DaemonSets:    []*types.DaemonSet{},
			Deployments:   []*types.Deployment{},
			PodHealths:    []*types.PodHealth{},
		},
	}
	return handler
}

func (handler *handler) keepUpdated(resultsChannel <-chan types.AnalysisResult) {
	for {
		newResults := <-resultsChannel
		handler.mutex.Lock()
		handler.lastAnalysisResult = newResults
		handler.mutex.Unlock()
	}
}

func (handler *handler) ServeHTTP(w http.ResponseWriter, _ *http.Request) {
	handler.mutex.RLock()
	defer handler.mutex.RUnlock()
	err := json.NewEncoder(w).Encode(handler.lastAnalysisResult)
	if err != nil {
		log.Println(err)
	}
}

func healthCheck(w http.ResponseWriter, _ *http.Request) {
	_, err := fmt.Fprintln(w, "OK")
	if err != nil {
		log.Println(err)
	}
}

func Expose(address string, resultsChannel <-chan types.AnalysisResult) {
	frontendDir, _ := fs.Sub(embeddedFrontend, "frontend")
	frontendHandler := http.FileServer(http.FS(frontendDir))
	apiHandler := newHandler()
	go apiHandler.keepUpdated(resultsChannel)
	mux := http.NewServeMux()
	mux.Handle("/", frontendHandler)
	mux.Handle("/api/analysisResult", apiHandler)
	mux.HandleFunc("/health", healthCheck)
	log.Printf("Listening to incoming requests on %s...\n", address)
	err := http.ListenAndServe(address, mux)
	if err != nil {
		log.Fatalln(err)
	}
}
