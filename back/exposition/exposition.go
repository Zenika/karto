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
			Pods:          make([]*types.Pod, 0),
			PodIsolations: make([]*types.PodIsolation, 0),
			AllowedRoutes: make([]*types.AllowedRoute, 0),
			Services:      make([]*types.Service, 0),
			Ingresses:     make([]*types.Ingress, 0),
			ReplicaSets:   make([]*types.ReplicaSet, 0),
			StatefulSets:  make([]*types.StatefulSet, 0),
			DaemonSets:    make([]*types.DaemonSet, 0),
			Deployments:   make([]*types.Deployment, 0),
			PodHealths:    make([]*types.PodHealth, 0),
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
